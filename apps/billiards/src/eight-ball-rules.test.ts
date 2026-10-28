import { afterEach, describe, expect, it, vi } from "vitest"
import { Vector3 } from "three"
import { Container } from "../upstream/src/container/container"
import { Controller } from "../upstream/src/controller/controller"
import { EightBall } from "../upstream/src/controller/rules/eightball"
import { AimEvent } from "../upstream/src/events/aimevent"
import { EventType } from "../upstream/src/events/eventtype"
import { PlaceBallEvent } from "../upstream/src/events/placeballevent"
import { Ball, State } from "../upstream/src/model/ball"
import { Outcome } from "../upstream/src/model/outcome"
import { Table } from "../upstream/src/model/table"
import { Session } from "../upstream/src/network/client/session"
import { Cue } from "../upstream/src/view/cue"

function fixture(type = 1) {
  Session.init("player", "You", "local-table", false, true)
  const session = Session.getInstance()
  session.p1type = type
  const white = new Ball(new Vector3(-.4, 0))
  const solid = new Ball(new Vector3(0, -.2), undefined, 1)
  const eight = new Ball(new Vector3(.4, 0), undefined, 8)
  const stripe = new Ball(new Vector3(0, .2), undefined, 9)
  const table = new Table([white, solid, eight, stripe])
  table.proximityIndicator = { hide: vi.fn() } as unknown as typeof table.proximityIndicator
  table.cue = {
    aim: new AimEvent(), aimMode: vi.fn(), showHelper: vi.fn(), moveTo: vi.fn(),
    aimAtNext: vi.fn(), avoidCueTouchingOtherBall: vi.fn(), updateAimInput: vi.fn(),
  } as unknown as Cue
  const container = {
    table, isSinglePlayer: false, freeAim: false,
    sound: { playSuccess: vi.fn() }, notify: vi.fn(), sendEvent: vi.fn(),
    recorder: { entries: [{ event: { type: EventType.AIM } }] },
    view: { camera: { suggestMode: vi.fn(), aimView: "aim", topView: "top" } },
  }
  const rules = new EightBall(container as unknown as Container)
  Object.assign(container, { rules })
  rules.cueball = white
  const end = vi.spyOn(rules, "handleGameEnd").mockReturnValue({ name: "End" } as Controller)
  const events = () => container.sendEvent.mock.calls.map(([event]) => event)
  return { rules, white, solid, eight, stripe, session, container, end, events }
}

function pot(ball: Ball, time = 2) {
  ball.state = State.InPocket
  return Outcome.pot(ball, 1, time)
}

afterEach(() => {
  Session.reset()
  vi.restoreAllMocks()
})

describe("eight-ball turn and foul rules", () => {
  it.each([1, 2])("keeps a legal own-group pot on the shooter's turn (group=%s)", type => {
    const f = fixture(type)
    const own = type === 1 ? f.solid : f.stripe
    const outcome = [Outcome.collision(f.white, own, 1, 1), pot(own)]
    expect(f.rules.update(outcome).name).toBe("Aim")
    expect(f.events().map(event => event.type)).toContain(EventType.WATCHAIM)
    expect(f.events().map(event => event.type)).not.toContain(EventType.STARTAIM)
    expect(f.session.myScore()).toBe(1)
  })

  it("passes a legal miss to the opponent", () => {
    const f = fixture()
    const outcome = [Outcome.collision(f.white, f.solid, 1, 1), Outcome.cushion(f.solid, 1, 2)]
    expect(f.rules.foulReason(outcome)).toBeNull()
    expect(f.rules.update(outcome).name).toBe("WatchAim")
    expect(f.events().map(event => event.type)).toEqual([EventType.STARTAIM])
  })

  it("passes the turn when only an opponent ball is potted after a legal first contact", () => {
    const f = fixture()
    const outcome = [Outcome.collision(f.white, f.solid, 1, 1), pot(f.stripe)]
    expect(f.rules.update(outcome).name).toBe("WatchAim")
    expect(f.events().map(event => event.type)).toContain(EventType.STARTAIM)
  })

  it.each(["scratch", "no contact", "wrong group", "no rail"])("gives the opponent ball in hand after %s", reason => {
    const f = fixture()
    const outcome = reason === "scratch"
      ? [Outcome.collision(f.white, f.solid, 1, 1), pot(f.white)]
      : reason === "wrong group"
        ? [Outcome.collision(f.white, f.stripe, 1, 1), Outcome.cushion(f.white, 1, 2)]
        : reason === "no rail"
          ? [Outcome.cushion(f.white, 1, 0), Outcome.collision(f.white, f.solid, 1, 1)]
          : []
    const expected = { scratch: "Cue ball potted", "no contact": "No ball hit", "wrong group": "Wrong group hit first", "no rail": "No cushion after contact" }[reason]
    expect(f.rules.foulReason(outcome)).toBe(expected)
    f.rules.currentBreak = 2
    expect(f.rules.update(outcome).name).toBe("WatchAim")
    const place = f.events().find(event => event.type === EventType.PLACEBALL) as PlaceBallEvent
    expect(place.useStartPos).toBe(true)
    expect(place.pos.toArray().every(Number.isFinite)).toBe(true)
    expect(f.container.notify).toHaveBeenCalledWith(expect.objectContaining({ subtext: expected, extra: "Ball in hand" }))
    expect(f.rules.currentBreak).toBe(0)
    expect(f.session.myScore()).toBe(0)
  })

  it.each([1, 2])("wins only after the shooter's group was cleared before the stroke (group=%s)", type => {
    const f = fixture(type)
    const own = type === 1 ? f.solid : f.stripe
    own.state = State.InPocket
    const outcome = [Outcome.collision(f.white, f.eight, 1, 1), pot(f.eight)]
    expect(f.rules.isEndOfGame(outcome)).toBe(true)
    expect(f.rules.update(outcome).name).toBe("End")
    expect(f.end).toHaveBeenCalledWith(true)
  })

  it.each([1, 2])("respotting an early eight does not award a win when the last group ball fell in the same stroke (group=%s)", type => {
    const f = fixture(type)
    const own = type === 1 ? f.solid : f.stripe
    const outcome = [Outcome.collision(f.white, own, 1, 1), pot(own), pot(f.eight, 3)]
    expect(f.rules.isEndOfGame(outcome)).toBe(false)
    expect(f.rules.update(outcome).name).toBe("WatchAim")
    expect(f.eight.onTable()).toBe(true)
    expect(own.onTable()).toBe(false)
    expect(f.events().map(event => event.type)).toEqual([EventType.RERACK, EventType.PLACEBALL])
    expect(f.end).not.toHaveBeenCalled()
  })

  it.each([1, 2])("loses on eight plus scratch after clearing own group even while the opponent's group remains (group=%s)", type => {
    const f = fixture(type)
    const own = type === 1 ? f.solid : f.stripe
    const other = type === 1 ? f.stripe : f.solid
    own.state = State.InPocket
    const outcome = [Outcome.collision(f.white, f.eight, 1, 1), pot(f.eight), pot(f.white, 3)]
    expect(other.onTable()).toBe(true)
    expect(f.rules.update(outcome).name).toBe("End")
    expect(f.end).toHaveBeenCalledWith(false, "8-ball pocketed on foul")
  })

  it("keeps the existing early-eight respot rule consistent on an open table foul", () => {
    const f = fixture(0)
    const outcome = [Outcome.collision(f.white, f.eight, 1, 1), pot(f.eight)]
    expect(f.rules.update(outcome).name).toBe("WatchAim")
    expect(f.eight.onTable()).toBe(true)
    expect(f.events().map(event => event.type)).toEqual([EventType.RERACK, EventType.PLACEBALL])
    expect(f.end).not.toHaveBeenCalled()
  })

  it("evaluates an explicit opponent group without borrowing the local player's group", () => {
    const f = fixture(1)
    f.stripe.state = State.InPocket
    const outcome = [Outcome.collision(f.white, f.eight, 1, 1), pot(f.eight)]
    expect(f.rules.isEndOfGame(outcome, 2)).toBe(true)
    expect(f.rules.isEndOfGame(outcome, 1)).toBe(false)
    f.session.p1type = 0
    expect(f.rules.isEndOfGame(outcome, 2)).toBe(true)
  })
})
