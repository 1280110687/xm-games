export const REVERSI_BOARD_SIZE = 8

export type ReversiStone = "black" | "white"
export type ReversiCell = ReversiStone | null
export type ReversiBoard = ReversiCell[][]
export type ReversiPosition = { row: number; col: number }

export type ReversiMove = {
  row: number
  col: number
  stone: ReversiStone
}

export type ReversiWinner = ReversiStone | "tie" | null

export type ReversiState = {
  board: ReversiBoard
  currentPlayer: ReversiStone
  gameOver: boolean
  winner: ReversiWinner
  lastPassedPlayer: ReversiStone | null
  moveHistory: ReversiMove[]
}

export type ReversiMoveError =
  | "GAME_FINISHED"
  | "OUT_OF_BOUNDS"
  | "WRONG_PLAYER"
  | "CELL_OCCUPIED"
  | "NO_FLIPS"

export type ReversiMoveResult =
  | { ok: true; state: ReversiState }
  | { ok: false; error: ReversiMoveError; state: ReversiState }

const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
] as const

function oppositeStone(stone: ReversiStone): ReversiStone {
  return stone === "black" ? "white" : "black"
}

export function isReversiPosition(row: number, col: number): boolean {
  return Number.isInteger(row)
    && Number.isInteger(col)
    && row >= 0
    && row < REVERSI_BOARD_SIZE
    && col >= 0
    && col < REVERSI_BOARD_SIZE
}

export function createReversiBoard(): ReversiBoard {
  const board = Array.from({ length: REVERSI_BOARD_SIZE }, () =>
    Array<ReversiCell>(REVERSI_BOARD_SIZE).fill(null),
  )
  board[3][3] = "white"
  board[3][4] = "black"
  board[4][3] = "black"
  board[4][4] = "white"
  return board
}

export function createReversiState(): ReversiState {
  return {
    board: createReversiBoard(),
    currentPlayer: "black",
    gameOver: false,
    winner: null,
    lastPassedPlayer: null,
    moveHistory: [],
  }
}

export function getFlippableReversiStones(
  board: ReversiBoard,
  row: number,
  col: number,
  player: ReversiStone,
): ReversiPosition[] {
  if (!isReversiPosition(row, col) || board[row]?.[col] !== null) return []

  const opponent = oppositeStone(player)
  const allFlippable: ReversiPosition[] = []

  for (const [rowStep, colStep] of DIRECTIONS) {
    const flippable: ReversiPosition[] = []
    let nextRow = row + rowStep
    let nextCol = col + colStep

    while (
      isReversiPosition(nextRow, nextCol)
      && board[nextRow][nextCol] === opponent
    ) {
      flippable.push({ row: nextRow, col: nextCol })
      nextRow += rowStep
      nextCol += colStep
    }

    if (
      flippable.length > 0
      && isReversiPosition(nextRow, nextCol)
      && board[nextRow][nextCol] === player
    ) {
      allFlippable.push(...flippable)
    }
  }

  return allFlippable
}

export function getReversiValidMoves(
  board: ReversiBoard,
  player: ReversiStone,
): ReversiPosition[] {
  const moves: ReversiPosition[] = []
  for (let row = 0; row < REVERSI_BOARD_SIZE; row += 1) {
    for (let col = 0; col < REVERSI_BOARD_SIZE; col += 1) {
      if (getFlippableReversiStones(board, row, col, player).length > 0) {
        moves.push({ row, col })
      }
    }
  }
  return moves
}

export function countReversiStones(
  board: ReversiBoard,
): Record<ReversiStone, number> {
  let black = 0
  let white = 0
  for (const row of board) {
    for (const cell of row) {
      if (cell === "black") black += 1
      else if (cell === "white") white += 1
    }
  }
  return { black, white }
}

function resolveWinner(board: ReversiBoard): Exclude<ReversiWinner, null> {
  const score = countReversiStones(board)
  if (score.black === score.white) return "tie"
  return score.black > score.white ? "black" : "white"
}

export function placeReversiStone(
  state: ReversiState,
  row: number,
  col: number,
  player: ReversiStone = state.currentPlayer,
): ReversiMoveResult {
  if (state.gameOver) return { ok: false, error: "GAME_FINISHED", state }
  if (!isReversiPosition(row, col)) return { ok: false, error: "OUT_OF_BOUNDS", state }
  if (player !== state.currentPlayer) return { ok: false, error: "WRONG_PLAYER", state }
  if (state.board[row][col] !== null) return { ok: false, error: "CELL_OCCUPIED", state }

  const flippable = getFlippableReversiStones(state.board, row, col, player)
  if (flippable.length === 0) return { ok: false, error: "NO_FLIPS", state }

  const board = state.board.map((boardRow) => [...boardRow])
  board[row][col] = player
  for (const position of flippable) board[position.row][position.col] = player

  const opponent = oppositeStone(player)
  const opponentCanMove = getReversiValidMoves(board, opponent).length > 0
  const currentPlayerCanMove = getReversiValidMoves(board, player).length > 0
  const gameOver = !opponentCanMove && !currentPlayerCanMove

  return {
    ok: true,
    state: {
      board,
      currentPlayer: opponentCanMove ? opponent : gameOver ? opponent : player,
      gameOver,
      winner: gameOver ? resolveWinner(board) : null,
      lastPassedPlayer: !gameOver && !opponentCanMove ? opponent : null,
      moveHistory: [...state.moveHistory, { row, col, stone: player }],
    },
  }
}
