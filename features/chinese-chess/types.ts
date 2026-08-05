export const XIANGQI_ROWS = 10
export const XIANGQI_COLS = 9

export type PieceType =
  | "king"
  | "advisor"
  | "elephant"
  | "horse"
  | "chariot"
  | "cannon"
  | "pawn"

export type PieceColor = "red" | "black"

export interface Piece {
  readonly type: PieceType
  readonly color: PieceColor
}

export type Cell = Piece | null
export type Board = Cell[][]

export interface Position {
  readonly row: number
  readonly col: number
}

export interface XiangqiMove {
  readonly from: Position
  readonly to: Position
}

export type Move = XiangqiMove

export interface XiangqiMoveRecord extends XiangqiMove {
  readonly piece: Piece
  readonly capturedPiece: Piece | null
  readonly positionKey: string
}

export interface XiangqiState {
  readonly board: Board
  readonly currentTurn: PieceColor
  readonly moveHistory: readonly XiangqiMoveRecord[]
  /** Position keys include the initial position and every position after a move. */
  readonly positionHistory: readonly string[]
  /** LAN-only safety adjudication; local and AI games leave this unset. */
  readonly termination?: "move-limit"
}

export type XiangqiWinReason = "checkmate" | "no-legal-move"
export type XiangqiDrawReason = "repetition" | "move-limit"

export type XiangqiGameResult =
  | {
      readonly over: false
      readonly winner: null
      readonly reason: null
      readonly inCheck: boolean
    }
  | {
      readonly over: true
      readonly winner: PieceColor
      readonly reason: XiangqiWinReason
      readonly inCheck: boolean
    }
  | {
      readonly over: true
      readonly winner: null
      readonly reason: XiangqiDrawReason
      readonly inCheck: boolean
    }

export type XiangqiMoveError =
  | "GAME_OVER"
  | "OUT_OF_BOUNDS"
  | "EMPTY_INTERSECTION"
  | "WRONG_TURN"
  | "ILLEGAL_MOVE"

export type XiangqiMoveResult =
  | {
      readonly ok: true
      readonly state: XiangqiState
      readonly result: XiangqiGameResult
    }
  | {
      readonly ok: false
      readonly error: XiangqiMoveError
      readonly state: XiangqiState
    }
