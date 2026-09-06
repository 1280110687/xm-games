import { describe, expect, it } from "vitest"
import { EXPERIENCE_MESSAGES, isContextMessage, isExperienceContext } from "./index"

const payload = {
  locale: "zh",
  categories: [{ id: "board", label: "棋类", description: "", games: [
    { href: "/gomoku", label: "五子棋", description: "" },
  ] }],
}

describe("experience bridge", () => {
  it("accepts the host catalogue and rejects malformed or external routes", () => {
    expect(isExperienceContext(payload)).toBe(true)
    expect(isExperienceContext({ ...payload, locale: "unknown" })).toBe(false)
    expect(isExperienceContext({ ...payload, locale: ["zh"] })).toBe(false)
    for (const href of ["https://example.com", "//example.com", "/\\example.com", null]) {
      expect(isExperienceContext({ ...payload, categories: [{ ...payload.categories[0], games: [
        { href, label: "", description: "" },
      ] }] })).toBe(false)
    }
    expect(isExperienceContext({ ...payload, categories: [null] })).toBe(false)
  })
  it("requires the expected parent and origin before accepting context", () => {
    const source = {} as Window
    const event = { origin: "https://host.test", source, data: {
      type: EXPERIENCE_MESSAGES.context, payload,
    } } as MessageEvent
    expect(isContextMessage(event, event.origin, source)).toBe(true)
    expect(isContextMessage(event, "https://other.test", source)).toBe(false)
    expect(isContextMessage(event, event.origin, {} as Window)).toBe(false)
    expect(isContextMessage(event, event.origin, null)).toBe(false)
  })
})
