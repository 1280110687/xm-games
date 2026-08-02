import {
  applyMove,
  createPositionKey,
  evaluateGameResult,
  generateLegalMoves,
  type Board,
  type Move,
  type Piece,
  type PieceColor,
  type PieceType,
  type XiangqiGameResult,
  type XiangqiState,
} from "../engine"
import {
  XIANGQI_AI_LIMITS,
  type XiangqiAiDifficulty,
  type XiangqiAiLimits,
  type XiangqiAiSearchStats,
} from "../ai-protocol"

const MATE_SCORE = 1_000_000
const INFINITY = MATE_SCORE + 100_000
const QUIESCENCE_DEPTH = 4
const TT_SIZE = 1 << 15
const TT_MASK = TT_SIZE - 1

const enum TranspositionFlag {
  Empty = 0,
  Exact = 1,
  LowerBound = 2,
  UpperBound = 3,
}

const PIECE_VALUES: Readonly<Record<PieceType, number>> = {
  king: 100_000,
  advisor: 210,
  elephant: 210,
  horse: 430,
  chariot: 900,
  cannon: 450,
  pawn: 100,
}

export type XiangqiAiSearchOptions = {
  limits?: Partial<XiangqiAiLimits>
  now?: () => number
  shouldStop?: () => boolean
}

export type XiangqiAiSearchResult = {
  move: Move | null
  stats: XiangqiAiSearchStats
}

type SearchContext = {
  startedAt: number
  deadline: number
  nodeLimit: number
  nodes: number
  now: () => number
  shouldStop?: () => boolean
  generation: number
}

type HashedPosition = {
  primary: number
  secondary: number
}

class SearchStopped extends Error {}

function oppositeColor(color: PieceColor): PieceColor {
  return color === "red" ? "black" : "red"
}

function encodeSquare(row: number, col: number): number {
  return row * 9 + col
}

function encodeMove(move: Move): number {
  return encodeSquare(move.from.row, move.from.col) * 90
    + encodeSquare(move.to.row, move.to.col)
    + 1
}

function hashPositionKey(key: string): HashedPosition {
  let primary = 0x811c9dc5
  let secondary = 0x9e3779b9

  for (let index = 0; index < key.length; index += 1) {
    const code = key.charCodeAt(index)
    primary = Math.imul(primary ^ code, 0x01000193) >>> 0
    secondary = Math.imul(secondary ^ code, 0x85ebca6b) >>> 0
    secondary ^= secondary >>> 13
  }

  return { primary, secondary: secondary >>> 0 }
}

function getPiece(board: Board, move: Move): Piece | null {
  return board[move.from.row]?.[move.from.col] ?? null
}

function getCapturedPiece(board: Board, move: Move): Piece | null {
  return board[move.to.row]?.[move.to.col] ?? null
}

function advancementBonus(piece: Piece, row: number): number {
  if (piece.type !== "pawn") return 0
  const advancement = piece.color === "red" ? 6 - row : row - 3
  const crossedRiver = piece.color === "red" ? row <= 4 : row >= 5
  return advancement * 8 + (crossedRiver ? 34 : 0)
}

function centralityBonus(piece: Piece, row: number, col: number): number {
  const fileDistance = Math.abs(4 - col)
  const rankDistance = Math.abs(4.5 - row)

  switch (piece.type) {
    case "horse":
      return Math.round(26 - fileDistance * 5 - rankDistance * 2)
    case "cannon":
      return Math.round(14 - fileDistance * 2 - rankDistance)
    case "chariot":
      return Math.round(8 - fileDistance)
    case "pawn":
      return Math.max(0, 6 - fileDistance * 2)
    case "advisor":
    case "elephant":
    case "king":
      return 0
  }
}

function evaluateMaterialAndPosition(board: Board): number {
  let score = 0

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const piece = board[row][col]
      if (!piece) continue

      const value = PIECE_VALUES[piece.type]
        + advancementBonus(piece, row)
        + centralityBonus(piece, row, col)
      score += piece.color === "red" ? value : -value
    }
  }

  return score
}

function evaluateForCurrentTurn(state: XiangqiState, mobility: number): number {
  const redPerspective = evaluateMaterialAndPosition(state.board)
  const currentPerspective = state.currentTurn === "red"
    ? redPerspective
    : -redPerspective

  return currentPerspective + mobility * 2
}

function terminalScore(
  state: XiangqiState,
  result: XiangqiGameResult,
  ply: number,
): number {
  if (!result.over || result.winner === null) return 0
  return result.winner === state.currentTurn
    ? MATE_SCORE - ply
    : -MATE_SCORE + ply
}

function moveOrderingScore(board: Board, move: Move, ttMoveCode: number): number {
  const encoded = encodeMove(move)
  if (encoded === ttMoveCode) return 2_000_000

  const captured = getCapturedPiece(board, move)
  const moving = getPiece(board, move)
  if (!captured || !moving) return -encoded

  return 1_000_000
    + PIECE_VALUES[captured.type] * 16
    - PIECE_VALUES[moving.type]
    - encoded
}

function orderMoves(board: Board, moves: Move[], ttMoveCode: number): Move[] {
  return [...moves].sort((left, right) => {
    const scoreDifference = moveOrderingScore(board, right, ttMoveCode)
      - moveOrderingScore(board, left, ttMoveCode)
    if (scoreDifference !== 0) return scoreDifference
    return encodeMove(left) - encodeMove(right)
  })
}

function resolveLimits(
  difficulty: XiangqiAiDifficulty,
  overrides?: Partial<XiangqiAiLimits>,
): XiangqiAiLimits {
  const defaults = XIANGQI_AI_LIMITS[difficulty]
  return {
    maxDepth: Math.max(1, Math.floor(overrides?.maxDepth ?? defaults.maxDepth)),
    nodeLimit: Math.max(1, Math.floor(overrides?.nodeLimit ?? defaults.nodeLimit)),
    timeLimitMs: Math.max(1, overrides?.timeLimitMs ?? defaults.timeLimitMs),
  }
}

function defaultNow(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now()
}

export class XiangqiAiEngine {
  private readonly primaryKeys = new Uint32Array(TT_SIZE)
  private readonly secondaryKeys = new Uint32Array(TT_SIZE)
  private readonly depths = new Int8Array(TT_SIZE)
  private readonly flags = new Uint8Array(TT_SIZE)
  private readonly scores = new Int32Array(TT_SIZE)
  private readonly moves = new Uint16Array(TT_SIZE)
  private readonly generations = new Uint16Array(TT_SIZE)
  private generation = 0

  search(
    state: XiangqiState,
    difficulty: XiangqiAiDifficulty,
    options: XiangqiAiSearchOptions = {},
  ): XiangqiAiSearchResult {
    const limits = resolveLimits(difficulty, options.limits)
    const now = options.now ?? defaultNow
    const startedAt = now()
    // Keep node-budgeted searches reproducible after undo/restart. The table
    // remains shared by every iterative-deepening pass within this search, but
    // earlier searches cannot change the ordering of an otherwise equal run.
    this.flags.fill(TranspositionFlag.Empty)
    this.generation = (this.generation + 1) & 0xffff
    if (this.generation === 0) this.generation = 1

    const context: SearchContext = {
      startedAt,
      deadline: startedAt + limits.timeLimitMs,
      nodeLimit: limits.nodeLimit,
      nodes: 0,
      now,
      shouldStop: options.shouldStop,
      generation: this.generation,
    }

    const gameResult = evaluateGameResult(state)
    if (gameResult.over) {
      return {
        move: null,
        stats: {
          depth: 0,
          nodes: 0,
          elapsedMs: Math.max(0, now() - startedAt),
          completed: true,
          score: terminalScore(state, gameResult, 0),
        },
      }
    }

    const rootMoves = orderMoves(state.board, generateLegalMoves(state), 0)
    const fallbackMove = rootMoves[0] ?? null
    if (!fallbackMove) {
      return {
        move: null,
        stats: {
          depth: 0,
          nodes: 0,
          elapsedMs: Math.max(0, now() - startedAt),
          completed: true,
          score: 0,
        },
      }
    }

    let bestMove = fallbackMove
    let bestScore = -INFINITY
    let completedDepth = 0
    let stopped = false

    for (let depth = 1; depth <= limits.maxDepth; depth += 1) {
      try {
        const iteration = this.searchRoot(state, rootMoves, depth, context)
        bestMove = iteration.move
        bestScore = iteration.score
        completedDepth = depth
      } catch (error) {
        if (!(error instanceof SearchStopped)) throw error
        stopped = true
        break
      }
    }

    return {
      move: bestMove,
      stats: {
        depth: completedDepth,
        nodes: context.nodes,
        elapsedMs: Math.max(0, now() - startedAt),
        completed: !stopped && completedDepth === limits.maxDepth,
        score: bestScore === -INFINITY ? 0 : bestScore,
      },
    }
  }

  private searchRoot(
    state: XiangqiState,
    rootMoves: Move[],
    depth: number,
    context: SearchContext,
  ): { move: Move; score: number } {
    this.checkBudget(context)
    const position = this.hashState(state)
    const ttMoveCode = this.probeMove(position)
    const orderedMoves = orderMoves(state.board, rootMoves, ttMoveCode)
    let alpha = -INFINITY
    const beta = INFINITY
    let bestMove = orderedMoves[0]
    let bestScore = -INFINITY

    for (const move of orderedMoves) {
      this.checkBudget(context)
      const applied = applyMove(state, move)
      if (!applied.ok) continue
      const score = -this.negamax(
        applied.state,
        applied.result,
        depth - 1,
        -beta,
        -alpha,
        1,
        context,
      )

      // A later root move may return the current alpha as a bound. Keeping the
      // first move in deterministic ordering avoids treating that bound as an
      // exact tie and replacing the genuinely evaluated best move.
      if (score > bestScore) {
        bestScore = score
        bestMove = move
      }
      if (score > alpha) alpha = score
    }

    this.store(position, depth, bestScore, TranspositionFlag.Exact, bestMove, context.generation)
    return { move: bestMove, score: bestScore }
  }

  private negamax(
    state: XiangqiState,
    result: XiangqiGameResult,
    depth: number,
    alphaInput: number,
    beta: number,
    ply: number,
    context: SearchContext,
  ): number {
    this.visitNode(context)
    if (result.over) return terminalScore(state, result, ply)
    if (depth <= 0) {
      return this.quiescence(state, result, alphaInput, beta, ply, QUIESCENCE_DEPTH, context)
    }

    const position = this.hashState(state)
    const cached = this.probe(position, depth, alphaInput, beta)
    if (cached.score !== null) return cached.score

    let alpha = alphaInput
    const originalAlpha = alphaInput
    let bestScore = -INFINITY
    let bestMove: Move | null = null
    const moves = orderMoves(state.board, generateLegalMoves(state), cached.moveCode)

    for (const move of moves) {
      this.checkBudget(context)
      const applied = applyMove(state, move)
      if (!applied.ok) continue
      const score = -this.negamax(
        applied.state,
        applied.result,
        depth - 1,
        -beta,
        -alpha,
        ply + 1,
        context,
      )

      if (score > bestScore) {
        bestScore = score
        bestMove = move
      }
      if (score > alpha) alpha = score
      if (alpha >= beta) break
    }

    if (!bestMove) return evaluateForCurrentTurn(state, moves.length)

    const flag = bestScore <= originalAlpha
      ? TranspositionFlag.UpperBound
      : bestScore >= beta
        ? TranspositionFlag.LowerBound
        : TranspositionFlag.Exact
    this.store(position, depth, bestScore, flag, bestMove, context.generation)
    return bestScore
  }

  private quiescence(
    state: XiangqiState,
    result: XiangqiGameResult,
    alphaInput: number,
    beta: number,
    ply: number,
    depth: number,
    context: SearchContext,
  ): number {
    this.visitNode(context)
    if (result.over) return terminalScore(state, result, ply)

    const legalMoves = generateLegalMoves(state)
    const standingScore = evaluateForCurrentTurn(state, legalMoves.length)
    if (depth <= 0) return standingScore

    let alpha = alphaInput
    if (!result.inCheck) {
      if (standingScore >= beta) return beta
      if (standingScore > alpha) alpha = standingScore
    }

    const tacticalMoves = result.inCheck
      ? legalMoves
      : legalMoves.filter((move) => getCapturedPiece(state.board, move) !== null)
    const orderedMoves = orderMoves(state.board, tacticalMoves, 0)

    for (const move of orderedMoves) {
      this.checkBudget(context)
      const applied = applyMove(state, move)
      if (!applied.ok) continue
      const score = -this.quiescence(
        applied.state,
        applied.result,
        -beta,
        -alpha,
        ply + 1,
        depth - 1,
        context,
      )
      if (score >= beta) return beta
      if (score > alpha) alpha = score
    }

    return alpha
  }

  private hashState(state: XiangqiState): HashedPosition {
    const positionKey = createPositionKey(state.board, state.currentTurn)
    const repetitionCount = state.positionHistory.reduce(
      (count, recordedKey) => count + (recordedKey === positionKey ? 1 : 0),
      0,
    )
    // Repetition is part of the game state even though it is not part of the
    // visible board. Without this suffix the TT could reuse a non-draw score
    // for the same board when it appears for the third time.
    return hashPositionKey(`${positionKey}#${Math.min(repetitionCount, 3)}`)
  }

  private probeMove(position: HashedPosition): number {
    const index = position.primary & TT_MASK
    return this.flags[index] !== TranspositionFlag.Empty
      && this.primaryKeys[index] === position.primary
      && this.secondaryKeys[index] === position.secondary
      ? this.moves[index]
      : 0
  }

  private probe(
    position: HashedPosition,
    depth: number,
    alpha: number,
    beta: number,
  ): { score: number | null; moveCode: number } {
    const index = position.primary & TT_MASK
    if (
      this.flags[index] === TranspositionFlag.Empty
      || this.primaryKeys[index] !== position.primary
      || this.secondaryKeys[index] !== position.secondary
    ) {
      return { score: null, moveCode: 0 }
    }

    const moveCode = this.moves[index]
    if (this.depths[index] < depth) return { score: null, moveCode }

    const score = this.scores[index]
    switch (this.flags[index]) {
      case TranspositionFlag.Exact:
        return { score, moveCode }
      case TranspositionFlag.LowerBound:
        return { score: score >= beta ? score : null, moveCode }
      case TranspositionFlag.UpperBound:
        return { score: score <= alpha ? score : null, moveCode }
      default:
        return { score: null, moveCode }
    }
  }

  private store(
    position: HashedPosition,
    depth: number,
    score: number,
    flag: TranspositionFlag,
    move: Move,
    generation: number,
  ): void {
    const index = position.primary & TT_MASK
    const samePosition = this.flags[index] !== TranspositionFlag.Empty
      && this.primaryKeys[index] === position.primary
      && this.secondaryKeys[index] === position.secondary
    const shouldReplace = !samePosition
      || this.generations[index] !== generation
      || depth >= this.depths[index]
    if (!shouldReplace) return

    this.primaryKeys[index] = position.primary
    this.secondaryKeys[index] = position.secondary
    this.depths[index] = Math.min(127, depth)
    this.flags[index] = flag
    this.scores[index] = score
    this.moves[index] = encodeMove(move)
    this.generations[index] = generation
  }

  private visitNode(context: SearchContext): void {
    context.nodes += 1
    this.checkBudget(context)
  }

  private checkBudget(context: SearchContext): void {
    if (
      context.nodes >= context.nodeLimit
      || context.now() >= context.deadline
      || context.shouldStop?.()
    ) {
      throw new SearchStopped()
    }
  }
}

export function findBestXiangqiMove(
  state: XiangqiState,
  difficulty: XiangqiAiDifficulty,
  options?: XiangqiAiSearchOptions,
): XiangqiAiSearchResult {
  return new XiangqiAiEngine().search(state, difficulty, options)
}

export function getOpponentColor(color: PieceColor): PieceColor {
  return oppositeColor(color)
}
