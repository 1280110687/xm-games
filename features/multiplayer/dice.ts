import {
  base64UrlToBytes,
  bytesToBase64Url,
  bytesToHex,
  canonicalJsonBytes,
  type JsonValue,
  type MultiplayerCrypto,
  webMultiplayerCrypto,
} from "./crypto"

const DICE_DOMAIN = "xm-games/dice/v1"
const DICE_NONCE_BYTES = 32
const MAX_DIE_HASH_ATTEMPTS = 64

export type DiceRoundContext = {
  roomId: string
  matchId: string
  round: number
  playerIds: readonly [string, string]
}

export type DiceCommit = {
  round: number
  playerId: string
  nonce: string
  commitment: string
}

export type DiceRoundResult = {
  round: number
  rolls: Record<string, number>
  firstPlayerId: string | null
  tied: boolean
  proof: string
}

function assertContext(context: DiceRoundContext): void {
  if (!context.roomId || !context.matchId) throw new TypeError("Dice room and match IDs are required")
  if (!Number.isSafeInteger(context.round) || context.round <= 0) {
    throw new RangeError("Dice round must be a positive safe integer")
  }
  if (
    context.playerIds.length !== 2
    || !context.playerIds[0]
    || !context.playerIds[1]
    || context.playerIds[0] === context.playerIds[1]
  ) {
    throw new TypeError("A dice round requires two distinct players")
  }
}

function commitmentInput(
  context: DiceRoundContext,
  playerId: string,
  nonce: string,
): Uint8Array {
  return canonicalJsonBytes([
    DICE_DOMAIN,
    context.roomId,
    context.matchId,
    context.round,
    playerId,
    nonce,
  ])
}

export async function createDiceCommit(
  context: DiceRoundContext,
  playerId: string,
  crypto: MultiplayerCrypto = webMultiplayerCrypto,
): Promise<DiceCommit> {
  assertContext(context)
  if (!context.playerIds.includes(playerId)) throw new TypeError("Player is not in this dice round")

  const nonceBytes = crypto.randomBytes(DICE_NONCE_BYTES)
  if (nonceBytes.byteLength !== DICE_NONCE_BYTES) {
    throw new Error(`Dice random source must return ${DICE_NONCE_BYTES} bytes`)
  }
  const nonce = bytesToBase64Url(nonceBytes)
  const commitment = bytesToHex(await crypto.sha256(commitmentInput(context, playerId, nonce)))
  return { round: context.round, playerId, nonce, commitment }
}

export async function verifyDiceReveal(
  context: DiceRoundContext,
  playerId: string,
  nonce: string,
  commitment: string,
  crypto: Pick<MultiplayerCrypto, "sha256"> = webMultiplayerCrypto,
): Promise<boolean> {
  assertContext(context)
  if (!context.playerIds.includes(playerId) || !/^[a-f\d]{64}$/iu.test(commitment)) return false

  try {
    if (base64UrlToBytes(nonce).byteLength !== DICE_NONCE_BYTES) return false
  } catch {
    return false
  }

  const actual = bytesToHex(await crypto.sha256(commitmentInput(context, playerId, nonce)))
  return actual === commitment.toLowerCase()
}

async function deriveUnbiasedDie(
  seed: string,
  playerId: string,
  crypto: Pick<MultiplayerCrypto, "sha256">,
): Promise<number> {
  for (let attempt = 0; attempt < MAX_DIE_HASH_ATTEMPTS; attempt += 1) {
    const digest = await crypto.sha256(canonicalJsonBytes([
      DICE_DOMAIN,
      "die",
      seed,
      playerId,
      attempt,
    ]))

    for (const byte of digest) {
      if (byte < 252) return (byte % 6) + 1
    }
  }

  throw new Error("Unable to derive an unbiased dice value")
}

export async function resolveDiceRound(
  context: DiceRoundContext,
  reveals: Readonly<Record<string, string>>,
  crypto: Pick<MultiplayerCrypto, "sha256"> = webMultiplayerCrypto,
): Promise<DiceRoundResult> {
  assertContext(context)
  const playerIds = [...context.playerIds].sort() as [string, string]

  for (const playerId of playerIds) {
    const nonce = reveals[playerId]
    if (!nonce || base64UrlToBytes(nonce).byteLength !== DICE_NONCE_BYTES) {
      throw new TypeError(`Missing or invalid reveal for ${playerId}`)
    }
  }

  const seedPayload: JsonValue = [
    DICE_DOMAIN,
    "seed",
    context.roomId,
    context.matchId,
    context.round,
    ...playerIds.flatMap((playerId) => [playerId, reveals[playerId]]),
  ]
  const seed = bytesToHex(await crypto.sha256(canonicalJsonBytes(seedPayload)))

  const rolls: Record<string, number> = {}
  for (const playerId of playerIds) {
    rolls[playerId] = await deriveUnbiasedDie(seed, playerId, crypto)
  }

  const tied = rolls[playerIds[0]] === rolls[playerIds[1]]
  const firstPlayerId = tied
    ? null
    : rolls[playerIds[0]] > rolls[playerIds[1]] ? playerIds[0] : playerIds[1]

  return {
    round: context.round,
    rolls,
    firstPlayerId,
    tied,
    proof: seed,
  }
}

export function nextDiceRound(context: DiceRoundContext): DiceRoundContext {
  assertContext(context)
  return { ...context, round: context.round + 1 }
}
