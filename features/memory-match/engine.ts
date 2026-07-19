export const MEMORY_MATCH_DIFFICULTIES = {
  easy: { rows: 3, columns: 4 },
  medium: { rows: 4, columns: 4 },
  hard: { rows: 4, columns: 5 },
} as const

export type MemoryMatchDifficulty = keyof typeof MEMORY_MATCH_DIFFICULTIES
export type MemoryMatchCardStatus = "hidden" | "revealed" | "matched"
export type MemoryMatchPhase = "playing" | "complete"
export type MemoryMatchTurnResult = "match" | "mismatch"
export type RandomSource = () => number

export interface MemoryMatchCard {
  id: string
  pairId: number
  status: MemoryMatchCardStatus
}

export interface MemoryMatchState {
  difficulty: MemoryMatchDifficulty
  rows: number
  columns: number
  cards: MemoryMatchCard[]
  selectedCardIds: string[]
  moves: number
  streak: number
  bestStreak: number
  matchedPairs: number
  totalPairs: number
  isLocked: boolean
  pendingResult: MemoryMatchTurnResult | null
  phase: MemoryMatchPhase
}

export interface RestartMemoryMatchOptions {
  difficulty?: MemoryMatchDifficulty
  random?: RandomSource
}

function normalizedRandomValue(random: RandomSource): number {
  const value = random()

  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(value, 0), 1 - Number.EPSILON)
}

function shuffle<T>(values: T[], random: RandomSource): T[] {
  const shuffled = [...values]

  for (let index = shuffled.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(normalizedRandomValue(random) * (index + 1))
    ;[shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ]
  }

  return shuffled
}

export function createMemoryMatchDeck(
  pairCount: number,
  random: RandomSource = Math.random,
): MemoryMatchCard[] {
  if (!Number.isInteger(pairCount) || pairCount <= 0) {
    throw new RangeError("Pair count must be a positive integer")
  }

  const cards = Array.from({ length: pairCount }, (_, pairId) => [
    { id: `${pairId}-a`, pairId, status: "hidden" as const },
    { id: `${pairId}-b`, pairId, status: "hidden" as const },
  ]).flat()

  return shuffle(cards, random)
}

export function createMemoryMatchState(
  difficulty: MemoryMatchDifficulty = "easy",
  random: RandomSource = Math.random,
): MemoryMatchState {
  const { rows, columns } = MEMORY_MATCH_DIFFICULTIES[difficulty]
  const cellCount = rows * columns

  if (cellCount % 2 !== 0) {
    throw new RangeError("Memory match layouts must contain an even cell count")
  }

  const totalPairs = cellCount / 2

  return {
    difficulty,
    rows,
    columns,
    cards: createMemoryMatchDeck(totalPairs, random),
    selectedCardIds: [],
    moves: 0,
    streak: 0,
    bestStreak: 0,
    matchedPairs: 0,
    totalPairs,
    isLocked: false,
    pendingResult: null,
    phase: "playing",
  }
}

export function selectMemoryMatchCard(
  state: MemoryMatchState,
  cardId: string,
): MemoryMatchState {
  if (state.isLocked || state.phase === "complete") return state

  const card = state.cards.find((candidate) => candidate.id === cardId)
  if (!card || card.status !== "hidden") return state

  const selectedCardIds = [...state.selectedCardIds, cardId]
  const cards = state.cards.map((candidate) =>
    candidate.id === cardId
      ? { ...candidate, status: "revealed" as const }
      : candidate,
  )

  if (selectedCardIds.length < 2) {
    return { ...state, cards, selectedCardIds }
  }

  const firstCard = cards.find(
    (candidate) => candidate.id === selectedCardIds[0],
  )
  const secondCard = cards.find(
    (candidate) => candidate.id === selectedCardIds[1],
  )
  const pendingResult =
    firstCard?.pairId === secondCard?.pairId ? "match" : "mismatch"

  return {
    ...state,
    cards,
    selectedCardIds,
    moves: state.moves + 1,
    isLocked: true,
    pendingResult,
  }
}

export function settleMemoryMatchTurn(
  state: MemoryMatchState,
): MemoryMatchState {
  if (
    !state.isLocked
    || state.selectedCardIds.length !== 2
    || state.pendingResult === null
  ) {
    return state
  }

  const selectedIds = new Set(state.selectedCardIds)

  if (state.pendingResult === "mismatch") {
    return {
      ...state,
      cards: state.cards.map((card) =>
        selectedIds.has(card.id) ? { ...card, status: "hidden" } : card,
      ),
      selectedCardIds: [],
      streak: 0,
      isLocked: false,
      pendingResult: null,
    }
  }

  const matchedPairs = state.matchedPairs + 1
  const streak = state.streak + 1
  const phase = matchedPairs === state.totalPairs ? "complete" : "playing"

  return {
    ...state,
    cards: state.cards.map((card) =>
      selectedIds.has(card.id) ? { ...card, status: "matched" } : card,
    ),
    selectedCardIds: [],
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    matchedPairs,
    isLocked: false,
    pendingResult: null,
    phase,
  }
}

export function restartMemoryMatch(
  state: MemoryMatchState,
  options: RestartMemoryMatchOptions = {},
): MemoryMatchState {
  return createMemoryMatchState(
    options.difficulty ?? state.difficulty,
    options.random ?? Math.random,
  )
}
