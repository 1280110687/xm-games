export const GOMOKU_BOARD_SIZE = 15

export type GomokuStone = "black" | "white"
export type GomokuCell = GomokuStone | null
export type GomokuBoard = GomokuCell[][]

export interface GomokuMove {
  row: number
  col: number
  stone: GomokuStone
}

export interface GomokuState {
  board: GomokuBoard
  currentPlayer: GomokuStone
  winner: GomokuStone | null
  isDraw: boolean
  moveHistory: GomokuMove[]
  undoUsed: Record<GomokuStone, boolean>
}

export type GomokuMoveError =
  | "GAME_FINISHED"
  | "OUT_OF_BOUNDS"
  | "CELL_OCCUPIED"
  | "WRONG_PLAYER"

export type GomokuMoveResult =
  | { ok: true; state: GomokuState }
  | { ok: false; error: GomokuMoveError; state: GomokuState }

export type GomokuUndoError = "GAME_FINISHED" | "NO_MOVES" | "UNDO_ALREADY_USED"

export type GomokuUndoResult =
  | { ok: true; state: GomokuState }
  | { ok: false; error: GomokuUndoError; state: GomokuState }

export type LanGomokuSnapshotError =
  | "INVALID_REVISION"
  | "INVALID_STATE_SHAPE"
  | "REVISION_MISMATCH"
  | "UNDO_NOT_ALLOWED"
  | "INVALID_MOVE"
  | "STATE_MISMATCH"

export type LanGomokuSnapshotValidationResult =
  | { ok: true; state: GomokuState }
  | {
      ok: false
      error: LanGomokuSnapshotError
      moveIndex?: number
      moveError?: GomokuMoveError
    }

export function createGomokuBoard(): GomokuBoard {
  return Array.from({ length: GOMOKU_BOARD_SIZE }, () =>
    Array<GomokuCell>(GOMOKU_BOARD_SIZE).fill(null),
  )
}

export function createGomokuState(
  currentPlayer: GomokuStone = "black",
): GomokuState {
  return {
    board: createGomokuBoard(),
    currentPlayer,
    winner: null,
    isDraw: false,
    moveHistory: [],
    undoUsed: { black: false, white: false },
  }
}

export function isGomokuPosition(row: number, col: number): boolean {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row < GOMOKU_BOARD_SIZE &&
    col >= 0 &&
    col < GOMOKU_BOARD_SIZE
  )
}

export function hasGomokuWinner(
  board: GomokuBoard,
  row: number,
  col: number,
  stone: GomokuStone,
): boolean {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ] as const

  for (const [rowStep, colStep] of directions) {
    let count = 1

    for (const sign of [-1, 1] as const) {
      for (let offset = 1; offset < GOMOKU_BOARD_SIZE; offset += 1) {
        const nextRow = row + rowStep * offset * sign
        const nextCol = col + colStep * offset * sign

        if (!isGomokuPosition(nextRow, nextCol)) break
        if (board[nextRow][nextCol] !== stone) break
        count += 1
      }
    }

    if (count >= 5) return true
  }

  return false
}

export function placeGomokuStone(
  state: GomokuState,
  row: number,
  col: number,
  player: GomokuStone = state.currentPlayer,
): GomokuMoveResult {
  if (state.winner || state.isDraw) {
    return { ok: false, error: "GAME_FINISHED", state }
  }

  if (!isGomokuPosition(row, col)) {
    return { ok: false, error: "OUT_OF_BOUNDS", state }
  }

  if (player !== state.currentPlayer) {
    return { ok: false, error: "WRONG_PLAYER", state }
  }

  if (state.board[row][col] !== null) {
    return { ok: false, error: "CELL_OCCUPIED", state }
  }

  const board = state.board.map((boardRow) => [...boardRow])
  board[row][col] = player
  const moveHistory = [...state.moveHistory, { row, col, stone: player }]
  const winner = hasGomokuWinner(board, row, col, player) ? player : null
  const isDraw = !winner && moveHistory.length === GOMOKU_BOARD_SIZE ** 2

  return {
    ok: true,
    state: {
      ...state,
      board,
      currentPlayer: winner || isDraw ? player : player === "black" ? "white" : "black",
      winner,
      isDraw,
      moveHistory,
    },
  }
}

export function undoLastGomokuMove(state: GomokuState): GomokuUndoResult {
  if (state.winner || state.isDraw) {
    return { ok: false, error: "GAME_FINISHED", state }
  }

  const lastMove = state.moveHistory.at(-1)
  if (!lastMove) {
    return { ok: false, error: "NO_MOVES", state }
  }

  if (state.undoUsed[lastMove.stone]) {
    return { ok: false, error: "UNDO_ALREADY_USED", state }
  }

  const board = state.board.map((boardRow) => [...boardRow])
  board[lastMove.row][lastMove.col] = null

  return {
    ok: true,
    state: {
      ...state,
      board,
      currentPlayer: lastMove.stone,
      moveHistory: state.moveHistory.slice(0, -1),
      undoUsed: {
        ...state.undoUsed,
        [lastMove.stone]: true,
      },
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value)
  return keys.length === expected.length && expected.every((key) => Object.hasOwn(value, key))
}

function isLanGomokuMove(value: unknown): value is GomokuMove {
  if (!isRecord(value) || !hasExactKeys(value, ["row", "col", "stone"])) return false
  return typeof value.row === "number"
    && typeof value.col === "number"
    && isGomokuPosition(value.row, value.col)
    && (value.stone === "black" || value.stone === "white")
}

function isLanGomokuSnapshotShape(value: unknown): value is GomokuState {
  if (
    !isRecord(value)
    || !hasExactKeys(value, [
      "board",
      "currentPlayer",
      "winner",
      "isDraw",
      "moveHistory",
      "undoUsed",
    ])
    || !Array.isArray(value.board)
    || value.board.length !== GOMOKU_BOARD_SIZE
    || !value.board.every((row) => (
      Array.isArray(row)
      && row.length === GOMOKU_BOARD_SIZE
      && row.every((cell) => cell === null || cell === "black" || cell === "white")
    ))
    || (value.currentPlayer !== "black" && value.currentPlayer !== "white")
    || (value.winner !== null && value.winner !== "black" && value.winner !== "white")
    || typeof value.isDraw !== "boolean"
    || !Array.isArray(value.moveHistory)
    || !value.moveHistory.every(isLanGomokuMove)
    || !isRecord(value.undoUsed)
    || !hasExactKeys(value.undoUsed, ["black", "white"])
  ) {
    return false
  }

  return typeof value.undoUsed.black === "boolean"
    && typeof value.undoUsed.white === "boolean"
}

function areGomokuStatesEqual(left: GomokuState, right: GomokuState): boolean {
  if (
    left.currentPlayer !== right.currentPlayer
    || left.winner !== right.winner
    || left.isDraw !== right.isDraw
    || left.undoUsed.black !== right.undoUsed.black
    || left.undoUsed.white !== right.undoUsed.white
    || left.moveHistory.length !== right.moveHistory.length
    || left.board.length !== right.board.length
  ) {
    return false
  }

  for (let index = 0; index < left.moveHistory.length; index += 1) {
    const leftMove = left.moveHistory[index]
    const rightMove = right.moveHistory[index]
    if (
      leftMove.row !== rightMove.row
      || leftMove.col !== rightMove.col
      || leftMove.stone !== rightMove.stone
    ) {
      return false
    }
  }

  for (let row = 0; row < left.board.length; row += 1) {
    if (left.board[row].length !== right.board[row].length) return false
    for (let col = 0; col < left.board[row].length; col += 1) {
      if (left.board[row][col] !== right.board[row][col]) return false
    }
  }

  return true
}

export function validateAndRebuildLanGomokuSnapshot(
  value: unknown,
  revision: number,
): LanGomokuSnapshotValidationResult {
  if (!Number.isSafeInteger(revision) || revision < 0) {
    return { ok: false, error: "INVALID_REVISION" }
  }
  if (!isLanGomokuSnapshotShape(value)) {
    return { ok: false, error: "INVALID_STATE_SHAPE" }
  }
  if (value.moveHistory.length !== revision) {
    return { ok: false, error: "REVISION_MISMATCH" }
  }
  if (value.undoUsed.black || value.undoUsed.white) {
    return { ok: false, error: "UNDO_NOT_ALLOWED" }
  }

  let rebuilt = createGomokuState()
  for (let moveIndex = 0; moveIndex < value.moveHistory.length; moveIndex += 1) {
    const move = value.moveHistory[moveIndex]
    const result = placeGomokuStone(rebuilt, move.row, move.col, move.stone)
    if (!result.ok) {
      return {
        ok: false,
        error: "INVALID_MOVE",
        moveIndex,
        moveError: result.error,
      }
    }
    rebuilt = result.state
  }

  if (!areGomokuStatesEqual(rebuilt, value)) {
    return { ok: false, error: "STATE_MISMATCH" }
  }

  return { ok: true, state: rebuilt }
}
