import { afterEach, describe, expect, it, vi } from "vitest"
import { BotRelay } from "../upstream/src/network/bot/botrelay"
import { BeginEvent } from "../upstream/src/events/beginevent"
import { EventUtil } from "../upstream/src/events/eventutil"

// Exercise the relay's real scheduling without creating a WebGL renderer.
function fixture() {
  const container = { paused: true }
  const handle = vi.fn()
  const callback = vi.fn()
  const relay = Object.assign(Object.create(BotRelay.prototype), {
    messageQueue: [], queueTimeoutId: null, sequenceTimeoutId: null,
    callback, logs: { incoming: vi.fn(), outgoing: vi.fn() },
    eventHandler: {handle}, container, disposed: false,
  }) as BotRelay
  return { relay, container, handle, callback }
}

afterEach(() => { vi.useRealTimers() })

describe("offline computer turn lifecycle", () => {
  it("preserves queued events while paused and processes them after resume", () => {
    vi.useFakeTimers()
    const {relay, container, handle} = fixture()
    relay.enqueueMessage(EventUtil.serialise(new BeginEvent()))
    vi.advanceTimersByTime(3000)
    expect(handle).not.toHaveBeenCalled()
    container.paused = false
    vi.advanceTimersByTime(500)
    expect(handle).toHaveBeenCalledOnce()
    relay.dispose()
  })

  it("holds a computer event sequence until resume without dropping it", () => {
    vi.useFakeTimers()
    const {relay, container, callback} = fixture()
    relay.publishSequenceToPlayer([new BeginEvent(), new BeginEvent()], 100)
    vi.advanceTimersByTime(1000)
    expect(callback).not.toHaveBeenCalled()
    container.paused = false
    vi.advanceTimersByTime(200)
    expect(callback).toHaveBeenCalledTimes(2)
    relay.dispose()
  })

  it("cancels both pending queues when the frame is disposed", () => {
    vi.useFakeTimers()
    const {relay, container, handle, callback} = fixture()
    relay.enqueueMessage(EventUtil.serialise(new BeginEvent()))
    relay.publishSequenceToPlayer([new BeginEvent()], 100)
    relay.dispose()
    container.paused = false
    vi.advanceTimersByTime(5000)
    expect(handle).not.toHaveBeenCalled()
    expect(callback).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
})
