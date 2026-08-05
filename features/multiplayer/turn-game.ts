import type { JsonValue } from "./crypto"

export type LanTurnGameApplication<State> =
  | { ok: true; state: State }
  | { ok: false; code: string }

/**
 * Keeps game rules separate from the shared LAN transport. Snapshots are
 * deliberately encoded by each game so long matches can persist a compact,
 * replayable action history instead of trusting a remote derived board.
 */
export interface LanTurnGameAdapter<
  State,
  Action,
  Side extends string,
> {
  gameId: string
  engineVersion: string
  sessionStorageKey: string
  pendingRequestStorageKey: string
  firstSide: Side
  secondSide: Side
  createInitialState: () => State
  parseAction: (value: unknown) => Action | null
  encodeAction: (action: Action) => JsonValue
  applyAction: (
    state: State,
    action: Action,
    authorSide: Side,
  ) => LanTurnGameApplication<State>
  encodeSnapshot: (state: State) => JsonValue
  validateAndRebuildSnapshot: (
    value: unknown,
    revision: number,
  ) => LanTurnGameApplication<State>
  getRevision: (state: State) => number
  getCurrentSide: (state: State) => Side | null
}

export function sideForPeer<Side extends string>(
  adapter: Pick<LanTurnGameAdapter<unknown, unknown, Side>, "firstSide" | "secondSide">,
  firstPeerId: string | null,
  localPeerId: string,
  remotePeerId: string,
  peerId: string,
): Side | null {
  if (!firstPeerId) return null
  if (peerId === firstPeerId) return adapter.firstSide
  if (peerId === localPeerId || peerId === remotePeerId) return adapter.secondSide
  return null
}
