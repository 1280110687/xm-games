export const BOARD_WIDTH = 10
export const BOARD_HEIGHT = 20
export const EMPTY_CELL = 0

export const TETROMINO_SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
} satisfies Record<string, number[][]>

export type TetrominoType = keyof typeof TETROMINO_SHAPES
export type GamePhase = "idle" | "playing" | "paused" | "gameOver"
export type Board = number[][]

export interface Piece {
  type: TetrominoType
  shape: number[][]
  x: number
  y: number
}

export interface TetrisState {
  board: Board
  currentPiece: Piece | null
  nextPiece: TetrominoType
  score: number
  lines: number
  level: number
  phase: GamePhase
}

export type TetrisAction =
  | {
      type: "start"
      firstPiece: TetrominoType
      nextPiece: TetrominoType
    }
  | { type: "tick"; nextPiece: TetrominoType }
  | { type: "move"; dx: number; dy: number }
  | { type: "rotate" }
  | { type: "hardDrop"; nextPiece: TetrominoType }
  | { type: "pause" }
  | { type: "resume" }

const TETROMINO_TYPES = Object.keys(TETROMINO_SHAPES) as TetrominoType[]
const LINE_CLEAR_POINTS = [0, 100, 300, 500, 800]

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array<number>(BOARD_WIDTH).fill(EMPTY_CELL)
  )
}

export function createInitialState(): TetrisState {
  return {
    board: createEmptyBoard(),
    currentPiece: null,
    // Keep server and first client render deterministic. A real preview is
    // supplied by the start action after the player begins a game.
    nextPiece: "I",
    score: 0,
    lines: 0,
    level: 1,
    phase: "idle",
  }
}

export function pickTetromino(randomValue: number): TetrominoType {
  const normalized = Math.min(Math.max(randomValue, 0), 1 - Number.EPSILON)
  return TETROMINO_TYPES[Math.floor(normalized * TETROMINO_TYPES.length)]
}

export function pieceValue(type: TetrominoType): number {
  return TETROMINO_TYPES.indexOf(type) + 1
}

export function spawnPiece(type: TetrominoType, board: Board): Piece | null {
  const shape = TETROMINO_SHAPES[type].map((row) => [...row])
  const piece: Piece = {
    type,
    shape,
    x: Math.floor((BOARD_WIDTH - shape[0].length) / 2),
    y: 0,
  }

  return isValidPosition(piece, board) ? piece : null
}

export function isValidPosition(piece: Piece, board: Board): boolean {
  for (let row = 0; row < piece.shape.length; row++) {
    for (let col = 0; col < piece.shape[row].length; col++) {
      if (!piece.shape[row][col]) continue

      const x = piece.x + col
      const y = piece.y + row
      if (x < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT) return false
      if (y >= 0 && board[y][x] !== EMPTY_CELL) return false
    }
  }

  return true
}

export function rotateMatrix(matrix: number[][]): number[][] {
  const rows = matrix.length
  const cols = matrix[0].length
  return Array.from({ length: cols }, (_, col) =>
    Array.from({ length: rows }, (_, row) => matrix[rows - row - 1][col])
  )
}

export function clearCompletedLines(board: Board): {
  board: Board
  linesCleared: number
} {
  const remainingRows = board
    .filter((row) => row.some((cell) => cell === EMPTY_CELL))
    .map((row) => [...row])
  const linesCleared = BOARD_HEIGHT - remainingRows.length
  const emptyRows = Array.from({ length: linesCleared }, () =>
    Array<number>(BOARD_WIDTH).fill(EMPTY_CELL)
  )

  return {
    board: [...emptyRows, ...remainingRows],
    linesCleared,
  }
}

function lockPiece(board: Board, piece: Piece): Board {
  const nextBoard = board.map((row) => [...row])
  const value = pieceValue(piece.type)

  for (let row = 0; row < piece.shape.length; row++) {
    for (let col = 0; col < piece.shape[row].length; col++) {
      if (!piece.shape[row][col]) continue

      const y = piece.y + row
      const x = piece.x + col
      if (y >= 0) nextBoard[y][x] = value
    }
  }

  return nextBoard
}

function settlePiece(
  state: TetrisState,
  piece: Piece,
  followingPiece: TetrominoType
): TetrisState {
  const cleared = clearCompletedLines(lockPiece(state.board, piece))
  const lines = state.lines + cleared.linesCleared
  const level = Math.floor(lines / 10) + 1
  const score =
    state.score +
    (LINE_CLEAR_POINTS[cleared.linesCleared] ?? 0) * state.level
  const currentPiece = spawnPiece(state.nextPiece, cleared.board)

  return {
    ...state,
    board: cleared.board,
    currentPiece,
    nextPiece: followingPiece,
    score,
    lines,
    level,
    phase: currentPiece ? "playing" : "gameOver",
  }
}

function movePiece(state: TetrisState, dx: number, dy: number): TetrisState {
  if (state.phase !== "playing" || !state.currentPiece) return state

  const currentPiece = {
    ...state.currentPiece,
    x: state.currentPiece.x + dx,
    y: state.currentPiece.y + dy,
  }

  return isValidPosition(currentPiece, state.board)
    ? { ...state, currentPiece }
    : state
}

function rotatePiece(state: TetrisState): TetrisState {
  if (state.phase !== "playing" || !state.currentPiece) return state

  const rotatedPiece = {
    ...state.currentPiece,
    shape: rotateMatrix(state.currentPiece.shape),
  }
  const kickOffsets = [0, -1, 1, -2, 2]

  for (const offset of kickOffsets) {
    const candidate = { ...rotatedPiece, x: rotatedPiece.x + offset }
    if (isValidPosition(candidate, state.board)) {
      return { ...state, currentPiece: candidate }
    }
  }

  return state
}

export function tetrisReducer(
  state: TetrisState,
  action: TetrisAction
): TetrisState {
  switch (action.type) {
    case "start": {
      const board = createEmptyBoard()
      return {
        board,
        currentPiece: spawnPiece(action.firstPiece, board),
        nextPiece: action.nextPiece,
        score: 0,
        lines: 0,
        level: 1,
        phase: "playing",
      }
    }

    case "tick": {
      if (state.phase !== "playing" || !state.currentPiece) return state

      const currentPiece = {
        ...state.currentPiece,
        y: state.currentPiece.y + 1,
      }
      return isValidPosition(currentPiece, state.board)
        ? { ...state, currentPiece }
        : settlePiece(state, state.currentPiece, action.nextPiece)
    }

    case "move":
      return movePiece(state, action.dx, action.dy)

    case "rotate":
      return rotatePiece(state)

    case "hardDrop": {
      if (state.phase !== "playing" || !state.currentPiece) return state

      let currentPiece = state.currentPiece
      while (
        isValidPosition({ ...currentPiece, y: currentPiece.y + 1 }, state.board)
      ) {
        currentPiece = { ...currentPiece, y: currentPiece.y + 1 }
      }
      return settlePiece(state, currentPiece, action.nextPiece)
    }

    case "pause":
      return state.phase === "playing"
        ? { ...state, phase: "paused" }
        : state

    case "resume":
      return state.phase === "paused"
        ? { ...state, phase: "playing" }
        : state
  }
}

export function getDisplayBoard(state: TetrisState): Board {
  const displayBoard = state.board.map((row) => [...row])
  const piece = state.currentPiece
  if (!piece) return displayBoard

  const value = pieceValue(piece.type)
  for (let row = 0; row < piece.shape.length; row++) {
    for (let col = 0; col < piece.shape[row].length; col++) {
      if (!piece.shape[row][col]) continue

      const y = piece.y + row
      const x = piece.x + col
      if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
        displayBoard[y][x] = value
      }
    }
  }

  return displayBoard
}
