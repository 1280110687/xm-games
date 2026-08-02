import { describe, expect, it } from "vitest"
import {
  acknowledgeMultiplayerAction,
  applyMultiplayerAcknowledgement,
  createJsonStateHasher,
  createReplicatedActionState,
  proposeMultiplayerAction,
  type ApplyMultiplayerAction,
} from "./action-machine"

type CounterState = { value: number; turn: string }
type CounterAction = { type: "increment" }

const applyCounterAction: ApplyMultiplayerAction<CounterState, CounterAction> = (
  state,
  action,
  authorId,
) => {
  if (action.type !== "increment" || state.turn !== authorId) {
    return { ok: false, code: "NOT_YOUR_TURN" }
  }
  return {
    ok: true,
    state: {
      value: state.value + 1,
      turn: authorId === "peer-a" ? "peer-b" : "peer-a",
    },
  }
}

describe("replicated action state machine", () => {
  it("commits the same revision on proposal and acknowledgement", async () => {
    const initial: CounterState = { value: 0, turn: "peer-a" }
    const hashState = createJsonStateHasher<CounterState>()
    let actor = await createReplicatedActionState<CounterState, CounterAction>(initial, hashState)
    let peer = await createReplicatedActionState<CounterState, CounterAction>(initial, hashState)

    const proposed = await proposeMultiplayerAction(actor, {
      messageId: "proposal-message-1",
      actionId: "action-1",
      authorId: "peer-a",
      action: { type: "increment" },
    }, applyCounterAction, hashState)
    expect(proposed.accepted).toBe(true)
    actor = proposed.machine

    const acknowledged = await acknowledgeMultiplayerAction(
      peer,
      proposed.proposal!,
      "ack-message-1",
      applyCounterAction,
      hashState,
    )
    expect(acknowledged.accepted).toBe(true)
    peer = acknowledged.machine

    const committed = applyMultiplayerAcknowledgement(actor, acknowledged.acknowledgement!)
    expect(committed.accepted).toBe(true)
    actor = committed.machine

    expect(actor.revision).toBe(1)
    expect(actor.state).toEqual(peer.state)
    expect(actor.stateHash).toBe(peer.stateHash)
  })

  it("returns the cached acknowledgement for a duplicate proposal", async () => {
    const initial: CounterState = { value: 0, turn: "peer-a" }
    const hashState = createJsonStateHasher<CounterState>()
    const peer = await createReplicatedActionState<CounterState, CounterAction>(initial, hashState)
    const proposal = {
      messageId: "proposal-message-1",
      actionId: "action-1",
      authorId: "peer-a",
      baseRevision: 0,
      action: { type: "increment" } as const,
    }

    const first = await acknowledgeMultiplayerAction(
      peer,
      proposal,
      "ack-message-1",
      applyCounterAction,
      hashState,
    )
    const duplicate = await acknowledgeMultiplayerAction(
      first.machine,
      proposal,
      "ack-message-2",
      applyCounterAction,
      hashState,
    )

    expect(duplicate.accepted).toBe(true)
    expect(duplicate.machine.revision).toBe(1)
    expect(duplicate.acknowledgement).toEqual(first.acknowledgement)
  })

  it("rejects illegal actions, stale revisions, and tampered hashes", async () => {
    const initial: CounterState = { value: 0, turn: "peer-a" }
    const hashState = createJsonStateHasher<CounterState>()
    const machine = await createReplicatedActionState<CounterState, CounterAction>(initial, hashState)

    const illegal = await proposeMultiplayerAction(machine, {
      messageId: "illegal-message",
      actionId: "illegal-action",
      authorId: "peer-b",
      action: { type: "increment" },
    }, applyCounterAction, hashState)
    expect(illegal.error).toBe("ILLEGAL_ACTION")
    expect(illegal.ruleError).toBe("NOT_YOUR_TURN")

    const stale = await proposeMultiplayerAction(machine, {
      messageId: "stale-message",
      actionId: "stale-action",
      authorId: "peer-a",
      baseRevision: 9,
      action: { type: "increment" },
    }, applyCounterAction, hashState)
    expect(stale.error).toBe("REVISION_MISMATCH")

    const valid = await proposeMultiplayerAction(machine, {
      messageId: "valid-message",
      actionId: "valid-action",
      authorId: "peer-a",
      action: { type: "increment" },
    }, applyCounterAction, hashState)
    const tampered = applyMultiplayerAcknowledgement(valid.machine, {
      messageId: "tampered-ack",
      actionId: "valid-action",
      baseRevision: 0,
      nextRevision: 1,
      nextStateHash: "0".repeat(64),
    })
    expect(tampered.error).toBe("STATE_HASH_MISMATCH")
    expect(tampered.machine.revision).toBe(0)
  })
})
