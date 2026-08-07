export const SCHULTE_LEVELS = {
  easy: { cellCount: 25, gridSize: 5 },
  medium: { cellCount: 36, gridSize: 6 },
  hard: { cellCount: 49, gridSize: 7 },
} as const

export const DEFAULT_WRONG_TAP_PENALTY_MS = 1_000
export const SCHULTE_RECORDS_VERSION = 1
export const SCHULTE_RECENT_RECORD_LIMIT = 10

export type SchulteLevel = keyof typeof SCHULTE_LEVELS
export type SchulteCellCount = (typeof SCHULTE_LEVELS)[SchulteLevel]["cellCount"]
export type SchulteGridSize = (typeof SCHULTE_LEVELS)[SchulteLevel]["gridSize"]
export type SchultePhase = "idle" | "running" | "completed"
export type SchulteCompletionReason = "solved" | "stopped"
export type RandomSource = () => number
export type TimeSource = () => number

export interface SchulteGridState {
  level: SchulteLevel
  cellCount: SchulteCellCount
  gridSize: SchulteGridSize
  numbers: readonly number[]
  phase: SchultePhase
  expectedNumber: number
  correctCount: number
  wrongCount: number
  startedAtMs: number | null
  accumulatedMs: number
  penaltyMs: number
  completedAtMs: number | null
  completionReason: SchulteCompletionReason | null
}

export interface SchulteRoundOptions {
  level?: SchulteLevel
  random?: RandomSource
  now?: TimeSource
}

export interface SchulteSelectionOptions {
  now?: TimeSource
  wrongTapPenaltyMs?: number
}

export interface SchulteFinalResult {
  level: SchulteLevel
  cellCount: SchulteCellCount
  outcome: SchulteCompletionReason
  solved: boolean
  progress: number
  total: number
  wrongCount: number
  activeElapsedMs: number
  penaltyMs: number
  elapsedMs: number
}

export interface SchulteRecord extends SchulteFinalResult {
  recordedAtMs: number
}

export type SchulteBestRecords = Partial<Record<SchulteLevel, SchulteRecord>>

export interface SchulteRecords {
  version: typeof SCHULTE_RECORDS_VERSION
  best: SchulteBestRecords
  recent: Partial<Record<SchulteLevel, readonly SchulteRecord[]>>
}

export interface UpdateSchulteRecordsOptions {
  now?: TimeSource
}

function defaultMonotonicNow(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now()
}

function readTime(now: TimeSource): number {
  const value = now()
  if (!Number.isFinite(value)) {
    throw new RangeError("The time source must return a finite number")
  }
  return value
}

function normalizedRandomValue(random: RandomSource): number {
  const value = random()
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(value, 0), 1 - Number.EPSILON)
}

function createOrderedNumbers(cellCount: SchulteCellCount): number[] {
  return Array.from({ length: cellCount }, (_, index) => index + 1)
}

export function shuffleSchulteNumbers(
  cellCount: SchulteCellCount,
  random: RandomSource = Math.random,
): number[] {
  const numbers = createOrderedNumbers(cellCount)

  for (let index = numbers.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(normalizedRandomValue(random) * (index + 1))
    ;[numbers[index], numbers[randomIndex]] = [
      numbers[randomIndex],
      numbers[index],
    ]
  }

  return numbers
}

export function createSchulteGridState(
  level: SchulteLevel = "easy",
): SchulteGridState {
  const { cellCount, gridSize } = SCHULTE_LEVELS[level]

  return {
    level,
    cellCount,
    gridSize,
    numbers: createOrderedNumbers(cellCount),
    phase: "idle",
    expectedNumber: 1,
    correctCount: 0,
    wrongCount: 0,
    startedAtMs: null,
    accumulatedMs: 0,
    penaltyMs: 0,
    completedAtMs: null,
    completionReason: null,
  }
}

export function startSchulteRound(
  state: SchulteGridState,
  options: SchulteRoundOptions = {},
): SchulteGridState {
  if (state.phase === "running") return state
  return restartSchulteRound(state, options)
}

export function restartSchulteRound(
  state: SchulteGridState,
  {
    level = state.level,
    random = Math.random,
    now = defaultMonotonicNow,
  }: SchulteRoundOptions = {},
): SchulteGridState {
  const { cellCount, gridSize } = SCHULTE_LEVELS[level]

  return {
    level,
    cellCount,
    gridSize,
    numbers: shuffleSchulteNumbers(cellCount, random),
    phase: "running",
    expectedNumber: 1,
    correctCount: 0,
    wrongCount: 0,
    startedAtMs: readTime(now),
    accumulatedMs: 0,
    penaltyMs: 0,
    completedAtMs: null,
    completionReason: null,
  }
}

export function getSchulteActiveElapsedMs(
  state: SchulteGridState,
  now: TimeSource = defaultMonotonicNow,
): number {
  if (state.phase !== "running" || state.startedAtMs === null) {
    return state.accumulatedMs
  }

  return state.accumulatedMs + Math.max(0, readTime(now) - state.startedAtMs)
}

export function getSchulteElapsedMs(
  state: SchulteGridState,
  now: TimeSource = defaultMonotonicNow,
): number {
  return getSchulteActiveElapsedMs(state, now) + state.penaltyMs
}

function completeSchulteRound(
  state: SchulteGridState,
  completionReason: SchulteCompletionReason,
  now: TimeSource,
): SchulteGridState {
  const completedAtMs = readTime(now)
  const accumulatedMs = state.startedAtMs === null
    ? state.accumulatedMs
    : state.accumulatedMs + Math.max(0, completedAtMs - state.startedAtMs)

  return {
    ...state,
    phase: "completed",
    startedAtMs: null,
    accumulatedMs,
    completedAtMs,
    completionReason,
  }
}

export function selectSchulteNumber(
  state: SchulteGridState,
  number: number,
  {
    now = defaultMonotonicNow,
    wrongTapPenaltyMs = DEFAULT_WRONG_TAP_PENALTY_MS,
  }: SchulteSelectionOptions = {},
): SchulteGridState {
  if (state.phase !== "running") return state
  if (!Number.isInteger(number) || number < 1 || number > state.cellCount) {
    return state
  }

  if (number !== state.expectedNumber) {
    if (!Number.isFinite(wrongTapPenaltyMs) || wrongTapPenaltyMs < 0) {
      throw new RangeError("The wrong-tap penalty must be a non-negative number")
    }

    return {
      ...state,
      wrongCount: state.wrongCount + 1,
      penaltyMs: state.penaltyMs + wrongTapPenaltyMs,
    }
  }

  const correctCount = state.correctCount + 1
  const progressedState: SchulteGridState = {
    ...state,
    expectedNumber: number + 1,
    correctCount,
  }

  return correctCount === state.cellCount
    ? completeSchulteRound(progressedState, "solved", now)
    : progressedState
}

export function stopSchulteRound(
  state: SchulteGridState,
  now: TimeSource = defaultMonotonicNow,
): SchulteGridState {
  return state.phase === "running"
    ? completeSchulteRound(state, "stopped", now)
    : state
}

export function getSchulteFinalResult(
  state: SchulteGridState,
): SchulteFinalResult | null {
  if (state.phase !== "completed" || state.completionReason === null) return null

  return {
    level: state.level,
    cellCount: state.cellCount,
    outcome: state.completionReason,
    solved: state.completionReason === "solved",
    progress: state.correctCount,
    total: state.cellCount,
    wrongCount: state.wrongCount,
    activeElapsedMs: state.accumulatedMs,
    penaltyMs: state.penaltyMs,
    elapsedMs: state.accumulatedMs + state.penaltyMs,
  }
}

export function createEmptySchulteRecords(): SchulteRecords {
  return {
    version: SCHULTE_RECORDS_VERSION,
    best: {},
    recent: {},
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isSchulteLevel(value: unknown): value is SchulteLevel {
  return typeof value === "string" && value in SCHULTE_LEVELS
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
}

function isValidSchulteRecord(value: unknown): value is SchulteRecord {
  if (!isObject(value) || !isSchulteLevel(value.level)) return false

  const { cellCount } = SCHULTE_LEVELS[value.level]
  const solved = value.outcome === "solved"
  const stopped = value.outcome === "stopped"

  if (!solved && !stopped) return false
  if (value.cellCount !== cellCount || value.total !== cellCount) return false
  if (value.solved !== solved) return false
  if (!Number.isInteger(value.progress) || (value.progress as number) < 0) return false
  if ((value.progress as number) > cellCount) return false
  if (solved && value.progress !== cellCount) return false
  if (stopped && value.progress === cellCount) return false
  if (!Number.isInteger(value.wrongCount) || (value.wrongCount as number) < 0) return false
  if (!isNonNegativeFinite(value.activeElapsedMs)) return false
  if (!isNonNegativeFinite(value.penaltyMs)) return false
  if (!isNonNegativeFinite(value.elapsedMs)) return false
  if (!isNonNegativeFinite(value.recordedAtMs)) return false

  return Math.abs(
    value.elapsedMs - (value.activeElapsedMs + value.penaltyMs),
  ) < 0.001
}

function isBetterSchulteRecord(
  candidate: SchulteRecord,
  current?: SchulteRecord,
): boolean {
  if (!current) return true
  if (candidate.elapsedMs !== current.elapsedMs) {
    return candidate.elapsedMs < current.elapsedMs
  }
  if (candidate.wrongCount !== current.wrongCount) {
    return candidate.wrongCount < current.wrongCount
  }
  return candidate.activeElapsedMs < current.activeElapsedMs
}

function bestFromRecords(records: readonly SchulteRecord[]): SchulteBestRecords {
  const best: SchulteBestRecords = {}

  for (const record of records) {
    if (!record.solved) continue
    if (isBetterSchulteRecord(record, best[record.level])) {
      best[record.level] = record
    }
  }

  return best
}

export function parseSchulteRecords(value: unknown): SchulteRecords {
  let parsed = value

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed) as unknown
    } catch {
      return createEmptySchulteRecords()
    }
  }

  if (!isObject(parsed) || parsed.version !== SCHULTE_RECORDS_VERSION) {
    return createEmptySchulteRecords()
  }

  const parsedRecent = isObject(parsed.recent) ? parsed.recent : null
  const recent = parsedRecent
    ? Object.fromEntries(
        (Object.keys(SCHULTE_LEVELS) as SchulteLevel[]).flatMap((level) => {
          const levelRecords = parsedRecent[level]
          if (!Array.isArray(levelRecords)) return []

          return [[
            level,
            levelRecords
              .filter(isValidSchulteRecord)
              .filter((record) => record.level === level)
              .slice(0, SCHULTE_RECENT_RECORD_LIMIT),
          ]]
        }),
      ) as SchulteRecords["recent"]
    : {}
  const storedBest = isObject(parsed.best)
    ? Object.values(parsed.best).filter(isValidSchulteRecord)
    : []
  const recentRecords = Object.values(recent).flatMap((records) => records ?? [])

  return {
    version: SCHULTE_RECORDS_VERSION,
    best: bestFromRecords([...storedBest, ...recentRecords]),
    recent,
  }
}

export function updateSchulteRecords(
  records: SchulteRecords,
  result: SchulteFinalResult,
  { now = Date.now }: UpdateSchulteRecordsOptions = {},
): SchulteRecords {
  const recordedAtMs = readTime(now)
  const record: SchulteRecord = { ...result, recordedAtMs }
  const recent = {
    ...records.recent,
    [record.level]: [
      record,
      ...(records.recent[record.level] ?? []),
    ].slice(0, SCHULTE_RECENT_RECORD_LIMIT),
  }
  const best = { ...records.best }

  if (
    record.solved
    && isBetterSchulteRecord(record, best[record.level])
  ) {
    best[record.level] = record
  }

  return {
    version: SCHULTE_RECORDS_VERSION,
    best,
    recent,
  }
}
