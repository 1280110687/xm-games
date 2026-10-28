import { describe, expect, it, vi } from "vitest"
import { Vector3 } from "three"
import { Aim } from "../upstream/src/controller/aim"
import { AimEvent } from "../upstream/src/events/aimevent"
import { EventType } from "../upstream/src/events/eventtype"
import { HitEvent } from "../upstream/src/events/hitevent"
import { Ball, State } from "../upstream/src/model/ball"
import { Table } from "../upstream/src/model/table"
import { maxPower } from "../upstream/src/model/physics/constants"
import { cueStrike } from "../upstream/src/model/physics/physics"
import { Cue } from "../upstream/src/view/cue"

function fixture(first: boolean) {
  const ball = new Ball(new Vector3())
  const table = new Table([ball])
  const value = { power: .22 }
  const aim = new AimEvent()
  aim.power = Math.fround(value.power * maxPower)
  const cue = Object.assign(Object.create(Cue.prototype), {
    aim, aimInputs: {
      setDisabled: vi.fn(), updateVisualState: vi.fn(), updateTiltSlider: vi.fn(), showOverlap: vi.fn(),
      updatePowerSlider(power: number) { value.power = power },
    },
  }) as Cue
  table.cue = cue
  table.proximityIndicator = { hide: vi.fn() } as unknown as typeof table.proximityIndicator
  const pending: number[] = []
  const container = {
    table, inputQueue: [], sound: {},
    view: { minimap: { hide: vi.fn() }, camera: { mode: "top", aimzView: "aimz", aimView: "aim", suggestMode: vi.fn() } },
    rules: { rulename: "eightball" },
    recorder: { entries: first ? [] : [{ event: { type: EventType.AIM } }] },
    sendEvent: vi.fn(), savePendingHit: () => pending.push(cue.aim.power),
  }
  const controller = Object.assign(Object.create(Aim.prototype), { container }) as Aim
  return { controller, container, cue, ball, value, pending }
}

describe("selected shot power", () => {
  it.each([true, false])("preserves input while recording and striking with the correct power (first=%s)", first => {
    const { controller, container, cue, ball, value, pending } = fixture(first)
    const selected = cue.aim.power
    const expected = first ? Math.fround(selected * 1.2) : selected
    const expectedStrike = cueStrike(cue.aim.angle, expected, cue.aim.offset, cue.aim.elevation)
    const next = controller.playShot()
    expect(next.name).toBe("PlayShot")
    expect(ball.state).toBe(State.Sliding)
    expect(ball.vel.distanceTo(expectedStrike.vel)).toBeLessThan(1e-6)
    expect(ball.rvel.distanceTo(expectedStrike.rvel)).toBeLessThan(1e-6)
    const event = container.sendEvent.mock.calls[0][0] as HitEvent
    expect(event.tablejson.aim.power).toBe(expected)
    expect(pending).toEqual([expected])
    expect(cue.aim.power).toBe(selected)
    expect(value.power).toBeCloseTo(.22)
  })
})
