import { hashJson, type JsonValue, type MultiplayerCrypto, webMultiplayerCrypto } from "./crypto"

const PROCESSED_ACTION_MESSAGE_LIMIT = 512
const ACK_CACHE_LIMIT = 128

export type ActionApplication<State> =
  | { ok: true; state: State }
  | { ok: false; code: string }

export type ApplyMultiplayerAction<State, Action extends JsonValue> = (
  state: State,
  action: Action,
  authorId: string,
) => ActionApplication<State>

export type HashMultiplayerState<State> = (state: State) => Promise<string>

export type ActionProposal<Action extends JsonValue = JsonValue> = {
  messageId: string
  actionId: string
  authorId: string
  baseRevision: number
  action: Action
}

export type ActionAcknowledgement = {
  messageId: string
  actionId: string
  baseRevision: number
  nextRevision: number
  nextStateHash: string
}

export type PendingAction<State, Action extends JsonValue> = {
  proposal: ActionProposal<Action>
  candidateState: State
  candidateStateHash: string
}

export type ReplicatedActionState<State, Action extends JsonValue = JsonValue> = {
  revision: number
  state: State
  stateHash: string
  pending: PendingAction<State, Action> | null
  processedMessageIds: string[]
  acknowledgements: ActionAcknowledgement[]
}

export type ActionMachineErrorCode =
  | "ACTION_PENDING"
  | "DUPLICATE_MESSAGE"
  | "ILLEGAL_ACTION"
  | "REVISION_MISMATCH"
  | "UNKNOWN_ACTION"
  | "STATE_HASH_MISMATCH"

export type ActionMachineResult<State, Action extends JsonValue = JsonValue> = {
  machine: ReplicatedActionState<State, Action>
  accepted: boolean
  error?: ActionMachineErrorCode
  ruleError?: string
  proposal?: ActionProposal<Action>
  acknowledgement?: ActionAcknowledgement
}

function boundedAppend<T>(values: readonly T[], value: T, limit: number): T[] {
  const next = [...values, value]
  return next.length > limit ? next.slice(next.length - limit) : next
}

function rememberMessage<State, Action extends JsonValue>(
  machine: ReplicatedActionState<State, Action>,
  messageId: string,
): ReplicatedActionState<State, Action> {
  return {
    ...machine,
    processedMessageIds: boundedAppend(
      machine.processedMessageIds,
      messageId,
      PROCESSED_ACTION_MESSAGE_LIMIT,
    ),
  }
}

function reject<State, Action extends JsonValue>(
  machine: ReplicatedActionState<State, Action>,
  error: ActionMachineErrorCode,
  ruleError?: string,
): ActionMachineResult<State, Action> {
  return { machine, accepted: false, error, ruleError }
}

export async function createReplicatedActionState<State extends JsonValue, Action extends JsonValue = JsonValue>(
  state: State,
  hashState: HashMultiplayerState<State> = (value) => hashJson(value),
): Promise<ReplicatedActionState<State, Action>> {
  return {
    revision: 0,
    state,
    stateHash: await hashState(state),
    pending: null,
    processedMessageIds: [],
    acknowledgements: [],
  }
}

export function createJsonStateHasher<State extends JsonValue>(
  crypto: Pick<MultiplayerCrypto, "sha256"> = webMultiplayerCrypto,
): HashMultiplayerState<State> {
  return (state) => hashJson(state, crypto)
}

export async function proposeMultiplayerAction<State, Action extends JsonValue>(
  machine: ReplicatedActionState<State, Action>,
  input: Omit<ActionProposal<Action>, "baseRevision"> & { baseRevision?: number },
  applyAction: ApplyMultiplayerAction<State, Action>,
  hashState: HashMultiplayerState<State>,
): Promise<ActionMachineResult<State, Action>> {
  if (machine.pending) return reject(machine, "ACTION_PENDING")
  if (machine.processedMessageIds.includes(input.messageId)) {
    return reject(machine, "DUPLICATE_MESSAGE")
  }

  const baseRevision = input.baseRevision ?? machine.revision
  if (baseRevision !== machine.revision) return reject(machine, "REVISION_MISMATCH")

  const application = applyAction(machine.state, input.action, input.authorId)
  if (!application.ok) return reject(machine, "ILLEGAL_ACTION", application.code)

  const candidateStateHash = await hashState(application.state)
  const proposal: ActionProposal<Action> = { ...input, baseRevision }
  const nextMachine = rememberMessage<State, Action>({
    ...machine,
    pending: {
      proposal,
      candidateState: application.state,
      candidateStateHash,
    },
  }, input.messageId)

  return { machine: nextMachine, accepted: true, proposal }
}

export async function acknowledgeMultiplayerAction<State, Action extends JsonValue>(
  machine: ReplicatedActionState<State, Action>,
  proposal: ActionProposal<Action>,
  acknowledgementMessageId: string,
  applyAction: ApplyMultiplayerAction<State, Action>,
  hashState: HashMultiplayerState<State>,
): Promise<ActionMachineResult<State, Action>> {
  const cachedAcknowledgement = machine.acknowledgements.find(
    (acknowledgement) => acknowledgement.actionId === proposal.actionId,
  )
  if (cachedAcknowledgement) {
    return {
      machine,
      accepted: true,
      acknowledgement: cachedAcknowledgement,
    }
  }
  if (machine.processedMessageIds.includes(proposal.messageId)) {
    return reject(machine, "DUPLICATE_MESSAGE")
  }
  if (proposal.baseRevision !== machine.revision) return reject(machine, "REVISION_MISMATCH")

  const application = applyAction(machine.state, proposal.action, proposal.authorId)
  if (!application.ok) return reject(machine, "ILLEGAL_ACTION", application.code)

  const nextStateHash = await hashState(application.state)
  const acknowledgement: ActionAcknowledgement = {
    messageId: acknowledgementMessageId,
    actionId: proposal.actionId,
    baseRevision: proposal.baseRevision,
    nextRevision: proposal.baseRevision + 1,
    nextStateHash,
  }

  let nextMachine: ReplicatedActionState<State, Action> = {
    ...machine,
    revision: acknowledgement.nextRevision,
    state: application.state,
    stateHash: nextStateHash,
    pending: null,
    acknowledgements: boundedAppend(
      machine.acknowledgements,
      acknowledgement,
      ACK_CACHE_LIMIT,
    ),
  }
  nextMachine = rememberMessage(nextMachine, proposal.messageId)
  nextMachine = rememberMessage(nextMachine, acknowledgementMessageId)

  return { machine: nextMachine, accepted: true, acknowledgement }
}

export function applyMultiplayerAcknowledgement<State, Action extends JsonValue>(
  machine: ReplicatedActionState<State, Action>,
  acknowledgement: ActionAcknowledgement,
): ActionMachineResult<State, Action> {
  if (machine.processedMessageIds.includes(acknowledgement.messageId)) {
    return reject(machine, "DUPLICATE_MESSAGE")
  }
  if (!machine.pending || machine.pending.proposal.actionId !== acknowledgement.actionId) {
    return reject(machine, "UNKNOWN_ACTION")
  }
  if (
    acknowledgement.baseRevision !== machine.revision
    || acknowledgement.nextRevision !== machine.revision + 1
  ) {
    return reject(machine, "REVISION_MISMATCH")
  }
  if (acknowledgement.nextStateHash !== machine.pending.candidateStateHash) {
    return reject(machine, "STATE_HASH_MISMATCH")
  }

  const nextMachine = rememberMessage<State, Action>({
    ...machine,
    revision: acknowledgement.nextRevision,
    state: machine.pending.candidateState,
    stateHash: acknowledgement.nextStateHash,
    pending: null,
    acknowledgements: boundedAppend(
      machine.acknowledgements,
      acknowledgement,
      ACK_CACHE_LIMIT,
    ),
  }, acknowledgement.messageId)

  return { machine: nextMachine, accepted: true, acknowledgement }
}

export function rejectPendingMultiplayerAction<State, Action extends JsonValue>(
  machine: ReplicatedActionState<State, Action>,
  actionId: string,
  rejectionMessageId: string,
): ActionMachineResult<State, Action> {
  if (machine.processedMessageIds.includes(rejectionMessageId)) {
    return reject(machine, "DUPLICATE_MESSAGE")
  }
  if (!machine.pending || machine.pending.proposal.actionId !== actionId) {
    return reject(machine, "UNKNOWN_ACTION")
  }

  return {
    machine: rememberMessage({ ...machine, pending: null }, rejectionMessageId),
    accepted: true,
  }
}
