import { afterEach, describe, expect, it, vi } from "vitest"
import { Vector3 } from "three"
import type { Container } from "../upstream/src/container/container"
import type { Controller } from "../upstream/src/controller/controller"
import { EightBall } from "../upstream/src/controller/rules/eightball"
import { AimEvent } from "../upstream/src/events/aimevent"
import { BeginEvent } from "../upstream/src/events/beginevent"
import { EventType } from "../upstream/src/events/eventtype"
import type { GameEvent } from "../upstream/src/events/gameevent"
import { PlaceBallEvent } from "../upstream/src/events/placeballevent"
import { Ball, State } from "../upstream/src/model/ball"
import { Outcome } from "../upstream/src/model/outcome"
import { Table } from "../upstream/src/model/table"
import { BotEventHandler } from "../upstream/src/network/bot/boteventhandler"
import type { Logger } from "../upstream/src/network/bot/logger"
import { Session } from "../upstream/src/network/client/session"
import type { Cue } from "../upstream/src/view/cue"

function fixture(type = 1) {
  vi.stubGlobal("location", { search: "?bot=TheFarJaw" })
  Session.init("human", "You", "local-table", false, true)
  const session = Session.getInstance()
  session.p1type = type
  const white = new Ball(new Vector3(-.4, 0))
  const solid = new Ball(new Vector3(0, -.2), undefined, 1)
  const eight = new Ball(new Vector3(.4, 0), undefined, 8)
  const stripe = new Ball(new Vector3(0, .2), undefined, 9)
  const table = new Table([white, solid, eight, stripe])
  table.cue = { aim: new AimEvent() } as Cue
  const container = {
    table, recorder: { entries: [{ event: { type: EventType.AIM } }] },
    notify: vi.fn(), sendScoreUpdate: vi.fn(),
    inferActivePlayer: () => 2,
    updateController: vi.fn(),
  }
  const rules = new EightBall(container as unknown as Container)
  rules.cueball = white
  Object.assign(container, { rules })
  const end = vi.spyOn(rules, "handleGameEnd").mockReturnValue({ name: "End" } as Controller)
  const sent: GameEvent[] = []
  const queued = vi.fn()
  const logs = { info: vi.fn(), hide: vi.fn(), show: vi.fn() } as unknown as Logger
  const handler = new BotEventHandler(logs, container as unknown as Container, events => sent.push(...events), queued)
  const stationary = (outcome: Outcome[]) => {
    table.outcome = outcome
    handler.handle(new BeginEvent())
  }
  return { handler, stationary, table, white, solid, eight, stripe, session, container, sent, queued, end }
}

function pot(ball: Ball, time = 2) {
  ball.state = State.InPocket
  return Outcome.pot(ball, 1, time)
}

afterEach(() => { Session.reset(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe("computer eight-ball turn decisions", () => {
  it.each([1, 2])("continues after a legal own-group pot (human group=%s)", type => {
    const f = fixture(type)
    const own = type === 1 ? f.stripe : f.solid
    f.stationary([Outcome.collision(f.white, own, 1, 1), pot(own)])
    expect(f.sent.map(e => e.type)).toEqual([EventType.WATCHAIM])
    expect(f.queued).toHaveBeenCalledOnce()
    expect(f.session.opponentScore()).toBe(1)
  })

  it.each([1, 2])("passes control when it only pockets the human's group (human group=%s)", type => {
    const f = fixture(type)
    const own = type === 1 ? f.stripe : f.solid
    const other = type === 1 ? f.solid : f.stripe
    f.stationary([Outcome.collision(f.white, own, 1, 1), pot(other)])
    expect(f.sent.map(e => e.type)).toEqual([EventType.STARTAIM])
    expect(f.queued).not.toHaveBeenCalled()
  })

  it("continues and assigns groups after an unambiguous open-table pot", () => {
    const f = fixture(0)
    f.stationary([Outcome.collision(f.white, f.stripe, 1, 1), pot(f.stripe)])
    expect(f.session.p1type).toBe(1)
    expect(f.sent.map(e => e.type)).toEqual([EventType.WATCHAIM])
    expect(f.queued).toHaveBeenCalledOnce()
  })

  it("passes control after a legal miss", () => {
    const f = fixture()
    f.stationary([Outcome.collision(f.white, f.stripe, 1, 1), Outcome.cushion(f.white, 1, 2)])
    expect(f.sent.map(e => e.type)).toEqual([EventType.STARTAIM])
    expect(f.queued).not.toHaveBeenCalled()
  })

  it.each(["scratch", "no contact", "wrong group", "no rail"])("gives the human ball in hand after %s", reason => {
    const f = fixture()
    const outcome = reason === "scratch"
      ? [Outcome.collision(f.white, f.stripe, 1, 1), pot(f.white)]
      : reason === "wrong group"
        ? [Outcome.collision(f.white, f.solid, 1, 1), Outcome.cushion(f.white, 1, 2)]
        : reason === "no rail" ? [Outcome.collision(f.white, f.stripe, 1, 1)] : []
    f.stationary(outcome)
    expect(f.sent.map(e => e.type)).toEqual([EventType.PLACEBALL])
    const place = f.sent[0] as PlaceBallEvent
    expect(place.useStartPos).toBe(true)
    expect(place.pos.toArray().every(Number.isFinite)).toBe(true)
    expect(f.white.onTable()).toBe(true)
    expect(f.container.notify).toHaveBeenCalledWith(expect.objectContaining({ type: "Foul", extra: "Ball in hand" }))
    expect(f.queued).not.toHaveBeenCalled()
  })

  it("loses on eight plus scratch after clearing its own group while the human's group remains", () => {
    const f = fixture()
    f.stripe.state = State.InPocket
    f.stationary([Outcome.collision(f.white, f.eight, 1, 1), pot(f.eight), pot(f.white, 3)])
    expect(f.solid.onTable()).toBe(true)
    expect(f.end).toHaveBeenCalledWith(true)
    expect(f.sent).toEqual([])
    expect(f.queued).not.toHaveBeenCalled()
  })

  it.each([0, 1])("respots an early eight and gives the human ball in hand (human group=%s)", type => {
    const f = fixture(type)
    f.stationary([Outcome.collision(f.white, f.eight, 1, 1), pot(f.eight)])
    expect(f.eight.onTable()).toBe(true)
    expect(f.sent.map(e => e.type)).toEqual([EventType.PLACEBALL])
    expect((f.sent[0] as PlaceBallEvent).respot?.id).toBe(f.eight.id)
    expect(f.end).not.toHaveBeenCalled()
  })

  it("respots the eight if the final own-group ball fell in the same stroke", () => {
    const f = fixture()
    f.stationary([Outcome.collision(f.white, f.stripe, 1, 1), pot(f.stripe), pot(f.eight, 3)])
    expect(f.eight.onTable()).toBe(true)
    expect(f.stripe.onTable()).toBe(false)
    expect(f.sent.map(e => e.type)).toEqual([EventType.PLACEBALL])
    expect(f.end).not.toHaveBeenCalled()
  })

  it("records the final legal eight before ending without queuing another shot", () => {
    const f = fixture()
    f.stripe.state = State.InPocket
    f.session.setOpponentScore(7)
    f.stationary([Outcome.collision(f.white, f.eight, 1, 1), pot(f.eight)])
    expect(f.session.opponentScore()).toBe(8)
    expect(f.end).toHaveBeenCalledWith(false)
    expect(f.sent).toEqual([])
    expect(f.queued).not.toHaveBeenCalled()
  })
})
