export type PieceType = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn"
export type Color = "white" | "black"
export type ChessPiece = { type: PieceType; color: Color }
export type Piece = ChessPiece | null
export type Position = { row: number; col: number }
export type ChessBoard = Piece[][]

export type CastlingRights = {
  whiteKing: boolean
  whiteQueen: boolean
  blackKing: boolean
  blackQueen: boolean
}

export type ChessPositionState = {
  board: ChessBoard
  castlingRights: CastlingRights
  enPassantTarget: Position | null
}

export const INITIAL_CASTLING_RIGHTS: CastlingRights = {
  whiteKing: true,
  whiteQueen: true,
  blackKing: true,
  blackQueen: true,
}

const BOARD_SIZE = 8

function isInsideBoard(position: Position): boolean {
  return position.row >= 0 && position.row < BOARD_SIZE && position.col >= 0 && position.col < BOARD_SIZE
}

function isSamePosition(left: Position, right: Position): boolean {
  return left.row === right.row && left.col === right.col
}

function oppositeColor(color: Color): Color {
  return color === "white" ? "black" : "white"
}

function isPathClear(board: ChessBoard, from: Position, to: Position): boolean {
  const rowDistance = to.row - from.row
  const colDistance = to.col - from.col
  const rowStep = rowDistance === 0 ? 0 : rowDistance > 0 ? 1 : -1
  const colStep = colDistance === 0 ? 0 : colDistance > 0 ? 1 : -1
  const steps = Math.max(Math.abs(rowDistance), Math.abs(colDistance))

  for (let step = 1; step < steps; step++) {
    if (board[from.row + step * rowStep][from.col + step * colStep]) return false
  }

  return true
}

function pieceAttacksSquare(
  board: ChessBoard,
  from: Position,
  target: Position,
  piece: ChessPiece,
): boolean {
  const dx = target.col - from.col
  const dy = target.row - from.row
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  switch (piece.type) {
    case "pawn": {
      const direction = piece.color === "white" ? -1 : 1
      return dy === direction && absDx === 1
    }
    case "knight":
      return (absDx === 2 && absDy === 1) || (absDx === 1 && absDy === 2)
    case "bishop":
      return absDx > 0 && absDx === absDy && isPathClear(board, from, target)
    case "rook":
      return (dx !== 0 || dy !== 0) && (dx === 0 || dy === 0) && isPathClear(board, from, target)
    case "queen": {
      const isStraight = (dx !== 0 || dy !== 0) && (dx === 0 || dy === 0)
      const isDiagonal = absDx > 0 && absDx === absDy
      return (isStraight || isDiagonal) && isPathClear(board, from, target)
    }
    case "king":
      return Math.max(absDx, absDy) === 1
  }
}

export function createInitialBoard(): ChessBoard {
  const board: ChessBoard = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  )
  const backRank: PieceType[] = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"]

  board[0] = backRank.map((type) => ({ type, color: "black" }))
  board[1] = Array.from({ length: BOARD_SIZE }, () => ({ type: "pawn", color: "black" }))
  board[6] = Array.from({ length: BOARD_SIZE }, () => ({ type: "pawn", color: "white" }))
  board[7] = backRank.map((type) => ({ type, color: "white" }))

  return board
}

export function isSquareAttacked(board: ChessBoard, position: Position, byColor: Color): boolean {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col]
      if (piece?.color === byColor && pieceAttacksSquare(board, { row, col }, position, piece)) {
        return true
      }
    }
  }

  return false
}

function findKing(board: ChessBoard, color: Color): Position | null {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col]
      if (piece?.type === "king" && piece.color === color) return { row, col }
    }
  }

  return null
}

export function isInCheck(board: ChessBoard, color: Color): boolean {
  const kingPosition = findKing(board, color)
  return kingPosition ? isSquareAttacked(board, kingPosition, oppositeColor(color)) : false
}

function canCastle(
  board: ChessBoard,
  color: Color,
  side: "king" | "queen",
  castlingRights: CastlingRights,
): boolean {
  const row = color === "white" ? 7 : 0
  const king = board[row][4]
  if (king?.type !== "king" || king.color !== color) return false

  const isKingSide = side === "king"
  const right = color === "white"
    ? isKingSide ? castlingRights.whiteKing : castlingRights.whiteQueen
    : isKingSide ? castlingRights.blackKing : castlingRights.blackQueen
  if (!right) return false

  const rookColumn = isKingSide ? 7 : 0
  const rook = board[row][rookColumn]
  if (rook?.type !== "rook" || rook.color !== color) return false

  const emptyColumns = isKingSide ? [5, 6] : [1, 2, 3]
  if (emptyColumns.some((col) => board[row][col] !== null)) return false

  const opponent = oppositeColor(color)
  const kingColumns = isKingSide ? [4, 5, 6] : [4, 3, 2]
  return kingColumns.every((col) => !isSquareAttacked(board, { row, col }, opponent))
}

function isPseudoLegalMove(state: ChessPositionState, from: Position, to: Position): boolean {
  if (!isInsideBoard(from) || !isInsideBoard(to) || isSamePosition(from, to)) return false

  const piece = state.board[from.row][from.col]
  if (!piece) return false

  const target = state.board[to.row][to.col]
  if (target?.color === piece.color) return false

  const dx = to.col - from.col
  const dy = to.row - from.row
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  switch (piece.type) {
    case "pawn": {
      const direction = piece.color === "white" ? -1 : 1
      const startRow = piece.color === "white" ? 6 : 1

      if (dx === 0 && !target) {
        if (dy === direction) return true
        if (
          from.row === startRow
          && dy === 2 * direction
          && !state.board[from.row + direction][from.col]
        ) {
          return true
        }
      }

      if (absDx === 1 && dy === direction) {
        if (target) return true
        if (state.enPassantTarget && isSamePosition(to, state.enPassantTarget)) {
          const capturedPawn = state.board[from.row][to.col]
          return capturedPawn?.type === "pawn" && capturedPawn.color === oppositeColor(piece.color)
        }
      }

      return false
    }
    case "knight":
      return (absDx === 2 && absDy === 1) || (absDx === 1 && absDy === 2)
    case "bishop":
      return absDx === absDy && isPathClear(state.board, from, to)
    case "rook":
      return (dx === 0 || dy === 0) && isPathClear(state.board, from, to)
    case "queen": {
      const isStraight = dx === 0 || dy === 0
      const isDiagonal = absDx === absDy
      return (isStraight || isDiagonal) && isPathClear(state.board, from, to)
    }
    case "king":
      if (absDx <= 1 && absDy <= 1) return true
      if (dy !== 0 || absDx !== 2) return false
      if (from.row !== (piece.color === "white" ? 7 : 0) || from.col !== 4) return false
      return canCastle(state.board, piece.color, dx > 0 ? "king" : "queen", state.castlingRights)
  }
}

function revokeCornerRookRight(
  castlingRights: CastlingRights,
  piece: Piece,
  position: Position,
): void {
  if (piece?.type !== "rook") return

  if (piece.color === "white" && position.row === 7 && position.col === 0) {
    castlingRights.whiteQueen = false
  } else if (piece.color === "white" && position.row === 7 && position.col === 7) {
    castlingRights.whiteKing = false
  } else if (piece.color === "black" && position.row === 0 && position.col === 0) {
    castlingRights.blackQueen = false
  } else if (piece.color === "black" && position.row === 0 && position.col === 7) {
    castlingRights.blackKing = false
  }
}

export function applyMove(
  state: ChessPositionState,
  from: Position,
  to: Position,
): ChessPositionState {
  const movingPiece = state.board[from.row]?.[from.col]
  if (!movingPiece) throw new Error("Cannot move an empty square")

  const board = state.board.map((row) => [...row])
  const castlingRights = { ...state.castlingRights }
  const capturedPiece = board[to.row]?.[to.col] ?? null

  if (movingPiece.type === "king") {
    if (movingPiece.color === "white") {
      castlingRights.whiteKing = false
      castlingRights.whiteQueen = false
    } else {
      castlingRights.blackKing = false
      castlingRights.blackQueen = false
    }
  }
  revokeCornerRookRight(castlingRights, movingPiece, from)
  revokeCornerRookRight(castlingRights, capturedPiece, to)

  board[from.row][from.col] = null

  const isEnPassant = movingPiece.type === "pawn"
    && state.enPassantTarget !== null
    && isSamePosition(to, state.enPassantTarget)
    && capturedPiece === null
    && Math.abs(to.col - from.col) === 1
  if (isEnPassant) board[from.row][to.col] = null

  if (movingPiece.type === "king" && Math.abs(to.col - from.col) === 2) {
    const rookColumn = to.col > from.col ? 7 : 0
    const rookDestination = to.col > from.col ? to.col - 1 : to.col + 1
    const rook = board[from.row][rookColumn]
    if (rook?.type === "rook" && rook.color === movingPiece.color) {
      board[from.row][rookDestination] = rook
      board[from.row][rookColumn] = null
    }
  }

  const placedPiece: ChessPiece = movingPiece.type === "pawn" && (to.row === 0 || to.row === 7)
    ? { type: "queen", color: movingPiece.color }
    : movingPiece
  board[to.row][to.col] = placedPiece

  const enPassantTarget = movingPiece.type === "pawn" && Math.abs(to.row - from.row) === 2
    ? { row: (to.row + from.row) / 2, col: to.col }
    : null

  return { board, castlingRights, enPassantTarget }
}

export function getValidMoves(state: ChessPositionState, from: Position): Position[] {
  const piece = state.board[from.row]?.[from.col]
  if (!piece) return []

  const moves: Position[] = []
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const to = { row, col }
      if (!isPseudoLegalMove(state, from, to)) continue

      const nextState = applyMove(state, from, to)
      if (!isInCheck(nextState.board, piece.color)) moves.push(to)
    }
  }

  return moves
}

export function hasLegalMoves(state: ChessPositionState, color: Color): boolean {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = state.board[row][col]
      if (piece?.color === color && getValidMoves(state, { row, col }).length > 0) return true
    }
  }

  return false
}
