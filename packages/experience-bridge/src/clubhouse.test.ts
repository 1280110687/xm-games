import { describe, expect, it } from "vitest"
import { CLUBHOUSE_ROOMS, isClubhouseCommand, isClubhouseSnapshot } from "./clubhouse"

const pose = { x: 0, y: 1.7, z: 2, yaw: 0, pitch: 0 }
const snapshot = { version: 1, place: "contact", pose, returnPose: pose }
describe("clubhouse protocol", () => {
  it("exposes precisely four physical rooms", () => {
    expect(CLUBHOUSE_ROOMS).toEqual(["gallery", "contact", "elemental", "treasure"])
    for (const room of CLUBHOUSE_ROOMS) expect(isClubhouseCommand({ action: "visit", room })).toBe(true)
    expect(isClubhouseCommand({ action: "visit", room: "about" })).toBe(false)
    expect(isClubhouseCommand({ action: "navigate", href: "//example.com" })).toBe(false)
    expect(isClubhouseCommand({ action: "pause", paused: "true" })).toBe(false)
  })
  it("validates saved poses instead of trusting session storage", () => {
    expect(isClubhouseSnapshot(snapshot)).toBe(true)
    for (const value of [null, [], {}, { ...snapshot, version: 0 }, { ...snapshot, place: "studio" }]) {
      expect(isClubhouseSnapshot(value)).toBe(false)
    }
    for (const value of [NaN, Infinity, 1000, "0", null]) {
      expect(isClubhouseSnapshot({ ...snapshot, pose: { ...pose, x: value } })).toBe(false)
    }
  })
})
