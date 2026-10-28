import { afterEach, describe, expect, it, vi } from "vitest"
import { Vector3 } from "three"
import { Container } from "../upstream/src/container/container"
import { Aim } from "../upstream/src/controller/aim"
import { PlaceBall } from "../upstream/src/controller/placeball"
import { WatchAim } from "../upstream/src/controller/watchaim"
import { AimEvent } from "../upstream/src/events/aimevent"
import { Input } from "../upstream/src/events/input"
import { Ball, State } from "../upstream/src/model/ball"
import { Table } from "../upstream/src/model/table"
import { maxPower } from "../upstream/src/model/physics/constants"
import { cueStrike } from "../upstream/src/model/physics/physics"
import { Session } from "../upstream/src/network/client/session"
import { Cue } from "../upstream/src/view/cue"
import { AimInputs } from "../upstream/src/view/dom/aiminputs"

function element(value = "") {
  return {
    value, innerText: "", disabled: false,
    style: { setProperty: vi.fn() }, classList: { toggle: vi.fn(), remove: vi.fn() },
    addEventListener: vi.fn(), setAttribute: vi.fn(),
  }
}

// Real cue, input listeners and controller dispatch, without a WebGL renderer.
function fixture() {
  Session.reset()
  const ball = new Ball(new Vector3())
  const table = new Table([ball])
  const cue = Object.assign(Object.create(Cue.prototype), {
    aim: new AimEvent(), cues: [], moveTo: vi.fn(), showHelper: vi.fn(),
    avoidCueTouchingOtherBall: vi.fn(), aimAtNext: vi.fn(),
  }) as Cue
  table.cue = cue
  table.proximityIndicator = { hide: vi.fn() } as unknown as typeof table.proximityIndicator
  const power = element("0.65")
  const percent = element()
  const hit = element()
  const elements: Record<string, ReturnType<typeof element>> = { cuePower: power, powerPercent: percent, cueHit: hit }
  vi.stubGlobal("document", {
    getElementById: (id: string) => elements[id] ?? null,
    addEventListener: vi.fn(), body: { classList: { contains: () => false } },
  })
  vi.stubGlobal("location", { search: "" })
  const container = Object.assign(Object.create(Container.prototype), {
    table, inputQueue: [], eventQueue: [], freeAim: false,
    view: { clearLines: vi.fn(), minimap: { hide: vi.fn() }, camera: { topView: "top", forceMode: vi.fn(), suggestMode: vi.fn() } },
    hud: { setActivePlayer: vi.fn() },
    sound: { playNotify: vi.fn() }, recorder: { record: vi.fn(), entries: [] },
    rules: { cueball: ball, allowsPlaceBall: () => true, placeBall: () => new Vector3(), nextCandidateBall: () => undefined },
    sendEvent: vi.fn(), savePendingHit: vi.fn(),
  }) as Container
  const inputs = new AimInputs(container)
  cue.aimInputs = inputs
  inputs.setDisabled(false)
  return { container, cue, ball, power, percent, hit, inputs }
}

afterEach(() => { vi.unstubAllGlobals(); Session.reset() })

describe("local controls across computer turns", () => {
  it("restores the player's power while leaving the opponent's actual strike unchanged", () => {
    const { container, cue, ball, power, inputs } = fixture()
    power.value = "0.22"
    inputs.powerChanged({})
    inputs.setDisabled(true)
    const opponent = new AimEvent()
    opponent.power = Math.fround(.69 * maxPower)
    const watch = Object.assign(Object.create(WatchAim.prototype), { container }) as WatchAim
    watch.handleAim(opponent)
    expect(Number(power.value)).toBeCloseTo(.69)
    const strike = cueStrike(opponent.angle, opponent.power, opponent.offset, opponent.elevation)
    tableHit(container)
    expect(ball.vel.distanceTo(strike.vel)).toBeLessThan(1e-6)
    expect(ball.rvel.distanceTo(strike.rvel)).toBeLessThan(1e-6)
    expect(cue.aim.power).toBe(opponent.power)

    new Aim(container).onFirst()
    expect(inputs.isDisabled()).toBe(false)
    expect(Number(power.value)).toBeCloseTo(.22)
    expect(cue.aim.power / maxPower).toBeCloseTo(.22)
    expect(ball.vel.distanceTo(strike.vel)).toBeLessThan(1e-6)
  })

  it("restores power for ball in hand and keeps a new selection when confirming placement", () => {
    const { container, cue, power, inputs } = fixture()
    power.value = "0.22"
    inputs.powerChanged({})
    inputs.setDisabled(true)
    const opponent = new AimEvent()
    opponent.power = maxPower
    const watch = Object.assign(Object.create(WatchAim.prototype), { container }) as WatchAim
    watch.handleAim(opponent)
    const placement = new PlaceBall(container)
    placement.onFirst()
    expect(Number(power.value)).toBeCloseTo(.22)
    power.value = "0.37"
    inputs.powerChanged({})
    placement.placed().onFirst()
    expect(cue.aim.power / maxPower).toBeCloseTo(.37)
  })

  it("does not turn repeated placement confirmation into an unintended shot", () => {
    const { container, inputs, ball } = fixture()
    container.updateController(new PlaceBall(container))
    inputs.hit({})
    inputs.hit({})
    container.inputQueue.push(new Input(8, "movementXUp"))
    container.processEvents()
    expect(container.controller.name).toBe("Aim")
    expect(ball.state).toBe(State.Stationary)
    expect(ball.vel.length()).toBe(0)
    expect(container.table.cue.aim.angle).toBeCloseTo(.016)
    // The next intentional press still strikes through the real dispatch path.
    inputs.hit({})
    container.processEvents()
    expect(container.controller.name).toBe("PlayShot")
    expect(ball.vel.length()).toBeGreaterThan(0)
  })

  it("preserves an explicitly configured initial shot", () => {
    const { container, cue, inputs } = fixture()
    inputs.setDisabled(true)
    vi.stubGlobal("location", { search: '?initShot={"power":2.5}' })
    new Aim(container).onFirst()
    expect(cue.aim.power).toBe(2.5)
  })
})

function tableHit(container: Container) { container.table.hit() }
