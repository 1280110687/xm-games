export type Stone = "black" | "white" | null

export type Position = {
  row: number
  col: number
}

export type Territory = {
  black: number
  white: number
}

export const GO_BOARD_SIZE = 9
export const GO_KOMI = 6.5
export const GO_MAX_ACTIONS = 512

export type GoPlayer = Exclude<Stone, null>
export type GoGameStatus = "playing" | "ended"
export type GoEndReason = "two-passes" | "action-limit"

export type GoPlaceAction = {
  type: "place"
  row: number
  col: number
}

export type GoPassAction = {
  type: "pass"
}

export type GoAction = GoPlaceAction | GoPassAction

export type GoActionRecord =
  | (GoPlaceAction & { player: GoPlayer })
  | (GoPassAction & { player: GoPlayer })

export type GoCaptures = Record<GoPlayer, number>

export type GoScore = {
  territory: Territory
  captures: GoCaptures
  komi: number
  black: number
  white: number
  winner: GoPlayer
  margin: number
}

export type GoState = {
  board: Stone[][]
  currentPlayer: GoPlayer
  captures: GoCaptures
  previousBoard: Stone[][] | null
  consecutivePasses: number
  status: GoGameStatus
  endReason: GoEndReason | null
  lastMove: Position | null
  actionHistory: GoActionRecord[]
  result: GoScore | null
}

export type GoActionError =
  | "GAME_FINISHED"
  | "ACTION_LIMIT_REACHED"
  | "WRONG_PLAYER"
  | "INVALID_ACTION"
  | "OUT_OF_BOUNDS"
  | "CELL_OCCUPIED"
  | "SUICIDE"
  | "KO_VIOLATION"

export type GoActionResult =
  | { ok: true; state: GoState }
  | { ok: false; error: GoActionError; state: GoState }

export function createEmptyBoard(boardSize: number): Stone[][] {
  return Array.from({ length: boardSize }, () =>
    Array<Stone>(boardSize).fill(null),
  )
}

export function getAdjacentPositions(
  board: Stone[][],
  row: number,
  col: number,
): Position[] {
  const adjacent: Position[] = []
  const rowCount = board.length
  const columnCount = board[row]?.length ?? 0

  if (row > 0) adjacent.push({ row: row - 1, col })
  if (row < rowCount - 1) adjacent.push({ row: row + 1, col })
  if (col > 0) adjacent.push({ row, col: col - 1 })
  if (col < columnCount - 1) adjacent.push({ row, col: col + 1 })

  return adjacent
}

export function getGroup(
  board: Stone[][],
  row: number,
  col: number,
): Position[] {
  const color = board[row]?.[col]
  if (!color) return []

  const group: Position[] = []
  const visited = new Set<string>()
  const stack: Position[] = [{ row, col }]

  while (stack.length > 0) {
    const position = stack.pop()!
    const key = `${position.row},${position.col}`
    if (visited.has(key)) continue
    visited.add(key)

    if (board[position.row][position.col] === color) {
      group.push(position)

      for (const adjacent of getAdjacentPositions(
        board,
        position.row,
        position.col,
      )) {
        if (!visited.has(`${adjacent.row},${adjacent.col}`)) {
          stack.push(adjacent)
        }
      }
    }
  }

  return group
}

export function countLiberties(
  board: Stone[][],
  group: Position[],
): number {
  const liberties = new Set<string>()

  for (const position of group) {
    for (const adjacent of getAdjacentPositions(
      board,
      position.row,
      position.col,
    )) {
      if (board[adjacent.row][adjacent.col] === null) {
        liberties.add(`${adjacent.row},${adjacent.col}`)
      }
    }
  }

  return liberties.size
}

export function removeGroup(
  board: Stone[][],
  group: Position[],
): Stone[][] {
  const newBoard = board.map((row) => [...row])

  for (const position of group) {
    newBoard[position.row][position.col] = null
  }

  return newBoard
}

export function isBoardSame(board1: Stone[][], board2: Stone[][]): boolean {
  if (board1.length !== board2.length) return false

  for (let row = 0; row < board1.length; row++) {
    if (board1[row].length !== board2[row].length) return false

    for (let col = 0; col < board1[row].length; col++) {
      if (board1[row][col] !== board2[row][col]) return false
    }
  }

  return true
}

export function calculateTerritory(board: Stone[][]): Territory {
  const visited = new Set<string>()
  let blackTerritory = 0
  let whiteTerritory = 0

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      if (board[row][col] !== null || visited.has(`${row},${col}`)) continue

      const region: Position[] = []
      const stack: Position[] = [{ row, col }]
      const borders = new Set<Stone>()

      while (stack.length > 0) {
        const position = stack.pop()!
        const key = `${position.row},${position.col}`
        if (visited.has(key)) continue
        visited.add(key)

        region.push(position)

        for (const adjacent of getAdjacentPositions(
          board,
          position.row,
          position.col,
        )) {
          const adjacentStone = board[adjacent.row][adjacent.col]

          if (adjacentStone === null) {
            if (!visited.has(`${adjacent.row},${adjacent.col}`)) {
              stack.push(adjacent)
            }
          } else {
            borders.add(adjacentStone)
          }
        }
      }

      if (borders.size === 1) {
        const color = Array.from(borders)[0]

        if (color === "black") {
          blackTerritory += region.length
        } else {
          whiteTerritory += region.length
        }
      }
    }
  }

  return { black: blackTerritory, white: whiteTerritory }
}

export function cloneGoBoard(board: Stone[][]): Stone[][] {
  return board.map((row) => [...row])
}

export function isGoPosition(row: number, col: number): boolean {
  return Number.isInteger(row)
    && Number.isInteger(col)
    && row >= 0
    && row < GO_BOARD_SIZE
    && col >= 0
    && col < GO_BOARD_SIZE
}

export function oppositeGoPlayer(player: GoPlayer): GoPlayer {
  return player === "black" ? "white" : "black"
}

export function createGoState(): GoState {
  return {
    board: createEmptyBoard(GO_BOARD_SIZE),
    currentPlayer: "black",
    captures: { black: 0, white: 0 },
    previousBoard: null,
    consecutivePasses: 0,
    status: "playing",
    endReason: null,
    lastMove: null,
    actionHistory: [],
    result: null,
  }
}

export function calculateGoScore(state: Pick<GoState, "board" | "captures">): GoScore {
  const territory = calculateTerritory(state.board)
  const captures = { ...state.captures }
  const black = captures.black + territory.black
  const white = captures.white + territory.white + GO_KOMI

  return {
    territory,
    captures,
    komi: GO_KOMI,
    black,
    white,
    winner: black > white ? "black" : "white",
    margin: Math.abs(black - white),
  }
}

function finishGoState(
  state: Omit<GoState, "result">,
): GoState {
  if (state.status === "playing") return { ...state, result: null }

  const stateWithoutResult: GoState = { ...state, result: null }
  return {
    ...stateWithoutResult,
    result: calculateGoScore(stateWithoutResult),
  }
}

function validateGoAction(action: GoAction): GoActionError | null {
  if (typeof action !== "object" || action === null) return "INVALID_ACTION"

  if (action.type === "pass") {
    return Object.keys(action).length === 1 ? null : "INVALID_ACTION"
  }

  if (action.type !== "place") return "INVALID_ACTION"
  if (Object.keys(action).length !== 3) return "INVALID_ACTION"
  return isGoPosition(action.row, action.col) ? null : "OUT_OF_BOUNDS"
}

function applyGoPass(state: GoState, player: GoPlayer): GoState {
  const consecutivePasses = state.consecutivePasses + 1
  const actionHistory: GoActionRecord[] = [
    ...state.actionHistory,
    { type: "pass", player },
  ]
  const endedByPasses = consecutivePasses >= 2
  const endedByLimit = actionHistory.length >= GO_MAX_ACTIONS

  return finishGoState({
    ...state,
    board: cloneGoBoard(state.board),
    currentPlayer: oppositeGoPlayer(player),
    captures: { ...state.captures },
    previousBoard: cloneGoBoard(state.board),
    consecutivePasses,
    status: endedByPasses || endedByLimit ? "ended" : "playing",
    endReason: endedByPasses
      ? "two-passes"
      : endedByLimit
        ? "action-limit"
        : null,
    lastMove: null,
    actionHistory,
  })
}

function applyGoPlacement(
  state: GoState,
  action: GoPlaceAction,
  player: GoPlayer,
): GoActionResult {
  if (state.board[action.row][action.col] !== null) {
    return { ok: false, error: "CELL_OCCUPIED", state }
  }

  const board = cloneGoBoard(state.board)
  board[action.row][action.col] = player
  const opponent = oppositeGoPlayer(player)
  let capturedStones = 0

  for (const adjacent of getAdjacentPositions(board, action.row, action.col)) {
    if (board[adjacent.row][adjacent.col] !== opponent) continue

    const group = getGroup(board, adjacent.row, adjacent.col)
    if (countLiberties(board, group) > 0) continue

    capturedStones += group.length
    for (const position of group) {
      board[position.row][position.col] = null
    }
  }

  if (countLiberties(board, getGroup(board, action.row, action.col)) === 0) {
    return { ok: false, error: "SUICIDE", state }
  }

  if (state.previousBoard && isBoardSame(board, state.previousBoard)) {
    return { ok: false, error: "KO_VIOLATION", state }
  }

  const actionHistory: GoActionRecord[] = [
    ...state.actionHistory,
    { ...action, player },
  ]
  const endedByLimit = actionHistory.length >= GO_MAX_ACTIONS
  const captures = {
    ...state.captures,
    [player]: state.captures[player] + capturedStones,
  }

  const nextState = finishGoState({
    board,
    currentPlayer: opponent,
    captures,
    previousBoard: cloneGoBoard(state.board),
    consecutivePasses: 0,
    status: endedByLimit ? "ended" : "playing",
    endReason: endedByLimit ? "action-limit" : null,
    lastMove: { row: action.row, col: action.col },
    actionHistory,
  })

  return { ok: true, state: nextState }
}

export function applyGoAction(
  state: GoState,
  action: GoAction,
  player: GoPlayer = state.currentPlayer,
): GoActionResult {
  if (state.status === "ended") {
    return { ok: false, error: "GAME_FINISHED", state }
  }
  if (state.actionHistory.length >= GO_MAX_ACTIONS) {
    return { ok: false, error: "ACTION_LIMIT_REACHED", state }
  }
  if (player !== state.currentPlayer) {
    return { ok: false, error: "WRONG_PLAYER", state }
  }

  const actionError = validateGoAction(action)
  if (actionError) return { ok: false, error: actionError, state }

  if (action.type === "pass") {
    return { ok: true, state: applyGoPass(state, player) }
  }

  return applyGoPlacement(state, action, player)
}
