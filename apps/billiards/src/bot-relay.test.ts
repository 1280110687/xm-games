import { afterEach, describe, expect, it, vi } from "vitest"
import { BotRelay } from "../upstream/src/network/bot/botrelay"
import { BeginEvent } from "../upstream/src/events/beginevent"
import { EventUtil } from "../upstream/src/events/eventutil"
import { WatchEvent } from "../upstream/src/events/watchevent"
import { StartAimEvent } from "../upstream/src/events/startaimevent"
import { AimEvent } from "../upstream/src/events/aimevent"
import { HitEvent } from "../upstream/src/events/hitevent"
import { EventType } from "../upstream/src/events/eventtype"

// Exercise the relay's real scheduling without creating a WebGL renderer.
function fixture() {
  const container = { paused: true }
  const handle = vi.fn()
  const callback = vi.fn()
  const relay = Object.assign(Object.create(BotRelay.prototype), {
    messageQueue: [], outgoingQueue: [], queueTimeoutId: null, sequenceTimeoutId: null,
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

  it.each([950, 1450, 1950])("keeps a continued computer turn ordered after a %ims pause", pauseTime => {
    vi.useFakeTimers()
    const {relay, container, handle, callback} = fixture()
    // The real pot handler sends WATCHAIM and queues its next STARTAIM on
    // separate 300ms/500ms timers. Pausing can reverse which timer resumes first.
    handle.mockImplementation(() => {
      relay.publishSequenceToPlayer([new AimEvent(), new HitEvent({})])
    })
    relay.publishSequenceToPlayer([new WatchEvent({})])
    relay.enqueueMessage(EventUtil.serialise(new StartAimEvent()))
    vi.advanceTimersByTime(pauseTime)
    container.paused = false
    vi.advanceTimersByTime(2000)
    expect(callback.mock.calls.map(([message]) => EventUtil.fromSerialised(message).type))
      .toEqual([EventType.WATCHAIM, EventType.AIM, EventType.HIT])
    relay.dispose()
  })

  it("keeps a single queue timer when a pot handler enqueues the next turn", () => {
    vi.useFakeTimers()
    const {relay, container, handle} = fixture()
    container.paused = false
    handle.mockImplementationOnce(() => {
      relay.enqueueMessage(EventUtil.serialise(new StartAimEvent()))
    })
    relay.enqueueMessage(EventUtil.serialise(new BeginEvent()))
    vi.advanceTimersByTime(500)
    expect(vi.getTimerCount()).toBe(1)
    relay.dispose()
    expect(vi.getTimerCount()).toBe(0)
  })
})
