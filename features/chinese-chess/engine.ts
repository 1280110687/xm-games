import {
  XIANGQI_COLS,
  XIANGQI_ROWS,
  type Board,
  type Piece,
  type PieceColor,
  type PieceType,
  type Position,
  type XiangqiGameResult,
  type XiangqiMove,
  type XiangqiMoveResult,
  type XiangqiState,
} from "./types"

const POSITION_CODES: Record<PieceColor, Record<PieceType, string>> = {
  red: {
    king: "K",
    advisor: "A",
    elephant: "E",
    horse: "H",
    chariot: "R",
    cannon: "C",
    pawn: "P",
  },
  black: {
    king: "k",
    advisor: "a",
    elephant: "e",
    horse: "h",
    chariot: "r",
    cannon: "c",
    pawn: "p",
  },
}

export function oppositeColor(color: PieceColor): PieceColor {
  return color === "red" ? "black" : "red"
}

export function isPositionInside(position: Position): boolean {
  return Number.isInteger(position.row)
    && Number.isInteger(position.col)
    && position.row >= 0
    && position.row < XIANGQI_ROWS
    && position.col >= 0
    && position.col < XIANGQI_COLS
}

export function createEmptyBoard(): Board {
  return Array.from({ length: XIANGQI_ROWS }, () =>
    Array.from({ length: XIANGQI_COLS }, () => null),
  )
}

export function createInitialBoard(): Board {
  const board = createEmptyBoard()
  const backRank: PieceType[] = [
    "chariot",
    "horse",
    "elephant",
    "advisor",
    "king",
    "advisor",
    "elephant",
    "horse",
    "chariot",
  ]

  board[0] = backRank.map((type) => ({ type, color: "black" }))
  board[2][1] = { type: "cannon", color: "black" }
  board[2][7] = { type: "cannon", color: "black" }
  for (const col of [0, 2, 4, 6, 8]) board[3][col] = { type: "pawn", color: "black" }

  board[9] = backRank.map((type) => ({ type, color: "red" }))
  board[7][1] = { type: "cannon", color: "red" }
  board[7][7] = { type: "cannon", color: "red" }
  for (const col of [0, 2, 4, 6, 8]) board[6][col] = { type: "pawn", color: "red" }

  return board
}

export function createPositionKey(board: Board, currentTurn: PieceColor): string {
  const boardKey = board
    .map((row) => row.map((piece) => piece ? POSITION_CODES[piece.color][piece.type] : ".").join(""))
    .join("/")

  return `${boardKey}:${currentTurn}`
}

export function createInitialState(): XiangqiState {
  const board = createInitialBoard()
  return {
    board,
    currentTurn: "red",
    moveHistory: [],
    positionHistory: [createPositionKey(board, "red")],
  }
}

function clonePiece(piece: Piece | null): Piece | null {
  return piece ? { ...piece } : null
}

function isSamePosition(left: Position, right: Position): boolean {
  return left.row === right.row && left.col === right.col
}

function isInPalace(position: Position, color: PieceColor): boolean {
  if (position.col < 3 || position.col > 5) return false
  return color === "red"
    ? position.row >= 7 && position.row <= 9
    : position.row >= 0 && position.row <= 2
}

function isOnOwnSide(row: number, color: PieceColor): boolean {
  return color === "red" ? row >= 5 : row <= 4
}

function countPiecesBetween(board: Board, from: Position, to: Position): number {
  if (from.row === to.row) {
    let count = 0
    const start = Math.min(from.col, to.col) + 1
    const end = Math.max(from.col, to.col)
    for (let col = start; col < end; col += 1) {
      if (board[from.row][col]) count += 1
    }
    return count
  }

  if (from.col === to.col) {
    let count = 0
    const start = Math.min(from.row, to.row) + 1
    const end = Math.max(from.row, to.row)
    for (let row = start; row < end; row += 1) {
      if (board[row][from.col]) count += 1
    }
    return count
  }

  return -1
}

function pieceCanReach(
  board: Board,
  from: Position,
  to: Position,
  piece: Piece,
  target: Piece | null,
): boolean {
  const rowDiff = to.row - from.row
  const colDiff = to.col - from.col
  const absRowDiff = Math.abs(rowDiff)
  const absColDiff = Math.abs(colDiff)

  switch (piece.type) {
    case "king":
      return isInPalace(to, piece.color)
        && ((absRowDiff === 1 && colDiff === 0) || (rowDiff === 0 && absColDiff === 1))

    case "advisor":
      return isInPalace(to, piece.color) && absRowDiff === 1 && absColDiff === 1

    case "elephant": {
      if (!isOnOwnSide(to.row, piece.color) || absRowDiff !== 2 || absColDiff !== 2) return false
      const eyeRow = from.row + rowDiff / 2
      const eyeCol = from.col + colDiff / 2
      return board[eyeRow][eyeCol] === null
    }

    case "horse": {
      if (!(
        (absRowDiff === 2 && absColDiff === 1)
        || (absRowDiff === 1 && absColDiff === 2)
      )) {
        return false
      }

      if (absRowDiff === 2) {
        const legRow = from.row + Math.sign(rowDiff)
        return board[legRow][from.col] === null
      }

      const legCol = from.col + Math.sign(colDiff)
      return board[from.row][legCol] === null
    }

    case "chariot":
      return (from.row === to.row || from.col === to.col)
        && countPiecesBetween(board, from, to) === 0

    case "cannon": {
      if (from.row !== to.row && from.col !== to.col) return false
      const screenCount = countPiecesBetween(board, from, to)
      return target === null ? screenCount === 0 : screenCount === 1
    }

    case "pawn": {
      const forward = piece.color === "red" ? -1 : 1
      if (isOnOwnSide(from.row, piece.color)) {
        return rowDiff === forward && colDiff === 0
      }
      return (rowDiff === forward && colDiff === 0)
        || (rowDiff === 0 && absColDiff === 1)
    }
  }
}

function pieceAttacksSquare(
  board: Board,
  from: Position,
  targetPosition: Position,
  piece: Piece,
): boolean {
  const target = board[targetPosition.row][targetPosition.col]

  if (piece.type === "king" && from.col === targetPosition.col) {
    return countPiecesBetween(board, from, targetPosition) === 0
  }

  return pieceCanReach(board, from, targetPosition, piece, target)
}

function findKing(board: Board, color: PieceColor): Position | null {
  for (let row = 0; row < XIANGQI_ROWS; row += 1) {
    for (let col = 0; col < XIANGQI_COLS; col += 1) {
      const piece = board[row][col]
      if (piece?.type === "king" && piece.color === color) return { row, col }
    }
  }
  return null
}

export function isInCheck(board: Board, color: PieceColor): boolean {
  const kingPosition = findKing(board, color)
  if (!kingPosition) return true

  const opponent = oppositeColor(color)
  for (let row = 0; row < XIANGQI_ROWS; row += 1) {
    for (let col = 0; col < XIANGQI_COLS; col += 1) {
      const piece = board[row][col]
      if (
        piece?.color === opponent
        && pieceAttacksSquare(board, { row, col }, kingPosition, piece)
      ) {
        return true
      }
    }
  }

  return false
}

function isPseudoLegalDestination(board: Board, from: Position, to: Position): boolean {
  if (!isPositionInside(from) || !isPositionInside(to) || isSamePosition(from, to)) return false

  const piece = board[from.row][from.col]
  if (!piece) return false

  const target = board[to.row][to.col]
  if (target?.color === piece.color) return false

  // A legal game ends before a king is physically captured. Checkmate and
  // no-legal-move are adjudicated by evaluateGameResult instead.
  if (target?.type === "king") return false

  return pieceCanReach(board, from, to, piece, target)
}

export function generatePseudoLegalMoves(board: Board, from: Position): Position[] {
  if (!isPositionInside(from)) return []
  const piece = board[from.row][from.col]
  if (!piece) return []

  const moves: Position[] = []

  const addCandidate = (row: number, col: number) => {
    const to = { row, col }
    if (isPseudoLegalDestination(board, from, to)) moves.push(to)
  }

  const addRayMoves = (isCannon: boolean) => {
    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const

    for (const [rowStep, colStep] of directions) {
      let row = from.row + rowStep
      let col = from.col + colStep
      let foundScreen = false

      while (isPositionInside({ row, col })) {
        const target = board[row][col]

        if (!isCannon) {
          if (!target) {
            moves.push({ row, col })
          } else {
            if (target.color !== piece.color && target.type !== "king") moves.push({ row, col })
            break
          }
        } else if (!foundScreen) {
          if (!target) moves.push({ row, col })
          else foundScreen = true
        } else if (target) {
          if (target.color !== piece.color && target.type !== "king") moves.push({ row, col })
          break
        }

        row += rowStep
        col += colStep
      }
    }
  }

  switch (piece.type) {
    case "king":
      for (const [rowStep, colStep] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        addCandidate(from.row + rowStep, from.col + colStep)
      }
      break

    case "advisor":
      for (const [rowStep, colStep] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) {
        addCandidate(from.row + rowStep, from.col + colStep)
      }
      break

    case "elephant":
      for (const [rowStep, colStep] of [[-2, -2], [-2, 2], [2, -2], [2, 2]] as const) {
        addCandidate(from.row + rowStep, from.col + colStep)
      }
      break

    case "horse":
      for (const [rowStep, colStep] of [
        [-2, -1], [-2, 1], [2, -1], [2, 1],
        [-1, -2], [1, -2], [-1, 2], [1, 2],
      ] as const) {
        addCandidate(from.row + rowStep, from.col + colStep)
      }
      break

    case "chariot":
      addRayMoves(false)
      break

    case "cannon":
      addRayMoves(true)
      break

    case "pawn": {
      const forward = piece.color === "red" ? -1 : 1
      addCandidate(from.row + forward, from.col)
      if (!isOnOwnSide(from.row, piece.color)) {
        addCandidate(from.row, from.col - 1)
        addCandidate(from.row, from.col + 1)
      }
      break
    }
  }

  return moves
}

function applyMoveToBoard(board: Board, move: XiangqiMove): Board {
  const movingPiece = board[move.from.row][move.from.col]
  if (!movingPiece) throw new Error("Cannot move an empty intersection")

  const nextBoard = [...board]
  const sourceRow = [...board[move.from.row]]
  nextBoard[move.from.row] = sourceRow
  sourceRow[move.from.col] = null

  if (move.from.row === move.to.row) {
    sourceRow[move.to.col] = movingPiece
  } else {
    const targetRow = [...board[move.to.row]]
    nextBoard[move.to.row] = targetRow
    targetRow[move.to.col] = movingPiece
  }

  return nextBoard
}

export function generateLegalMoves(state: XiangqiState, from?: Position): XiangqiMove[] {
  if (from && !isPositionInside(from)) return []

  const moves: XiangqiMove[] = []
  const positions: Position[] = from
    ? [from]
    : Array.from({ length: XIANGQI_ROWS * XIANGQI_COLS }, (_, index) => ({
        row: Math.floor(index / XIANGQI_COLS),
        col: index % XIANGQI_COLS,
      }))

  for (const source of positions) {
    const piece = state.board[source.row][source.col]
    if (piece?.color !== state.currentTurn) continue

    for (const to of generatePseudoLegalMoves(state.board, source)) {
      const move = { from: source, to }
      const nextBoard = applyMoveToBoard(state.board, move)
      if (!isInCheck(nextBoard, state.currentTurn)) moves.push(move)
    }
  }

  return moves
}

function countCurrentPosition(state: XiangqiState): number {
  const key = createPositionKey(state.board, state.currentTurn)
  return state.positionHistory.reduce(
    (count, recordedKey) => count + (recordedKey === key ? 1 : 0),
    0,
  )
}

export function evaluateGameResult(state: XiangqiState): XiangqiGameResult {
  const inCheck = isInCheck(state.board, state.currentTurn)
  const legalMoves = generateLegalMoves(state)

  if (legalMoves.length === 0) {
    return {
      over: true,
      winner: oppositeColor(state.currentTurn),
      reason: inCheck ? "checkmate" : "no-legal-move",
      inCheck,
    }
  }

  if (countCurrentPosition(state) >= 3) {
    return {
      over: true,
      winner: null,
      reason: "repetition",
      inCheck,
    }
  }

  return { over: false, winner: null, reason: null, inCheck }
}

export function applyMove(state: XiangqiState, move: XiangqiMove): XiangqiMoveResult {
  if (countCurrentPosition(state) >= 3) {
    return { ok: false, error: "GAME_OVER", state }
  }
  if (!isPositionInside(move.from) || !isPositionInside(move.to)) {
    return { ok: false, error: "OUT_OF_BOUNDS", state }
  }

  const movingPiece = state.board[move.from.row][move.from.col]
  if (!movingPiece) return { ok: false, error: "EMPTY_INTERSECTION", state }
  if (movingPiece.color !== state.currentTurn) {
    return { ok: false, error: "WRONG_TURN", state }
  }

  const legalMove = generateLegalMoves(state, move.from).find(
    (candidate) => isSamePosition(candidate.to, move.to),
  )
  if (!legalMove) {
    if (evaluateGameResult(state).over) return { ok: false, error: "GAME_OVER", state }
    return { ok: false, error: "ILLEGAL_MOVE", state }
  }

  const capturedPiece = state.board[move.to.row][move.to.col]
  const board = applyMoveToBoard(state.board, move)
  const currentTurn = oppositeColor(state.currentTurn)
  const positionKey = createPositionKey(board, currentTurn)

  const nextState: XiangqiState = {
    board,
    currentTurn,
    moveHistory: [
      ...state.moveHistory,
      {
        from: { ...move.from },
        to: { ...move.to },
        piece: { ...movingPiece },
        capturedPiece: clonePiece(capturedPiece),
        positionKey,
      },
    ],
    positionHistory: [...state.positionHistory, positionKey],
  }

  return {
    ok: true,
    state: nextState,
    result: evaluateGameResult(nextState),
  }
}

export type {
  Board,
  Piece,
  PieceColor,
  PieceType,
  Position,
  XiangqiGameResult,
  XiangqiMove,
  XiangqiMoveError,
  XiangqiMoveResult,
  XiangqiState,
  Move,
} from "./types"
