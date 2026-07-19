export const DEFAULT_BOARD_SIZE = 20
export const INITIAL_SPEED = 150
export const MIN_SPEED = 50
export const SPEED_STEP = 10
export const POINTS_PER_FOOD = 10

export interface Position {
  x: number
  y: number
}

export type SnakePhase = "idle" | "playing" | "paused" | "gameOver" | "won"

export interface SnakeState {
  boardSize: number
  snake: Position[]
  food: Position | null
  direction: Position
  nextDirection: Position
  score: number
  highScore: number
  speed: number
  phase: SnakePhase
}

export type SnakeAction =
  | { type: "hydrateHighScore"; highScore: number }
  | { type: "start"; foodRoll: number }
  | { type: "togglePause" }
  | { type: "changeDirection"; direction: Position }
  | { type: "tick"; foodRoll: number }

const INITIAL_DIRECTION: Position = { x: 1, y: 0 }

function samePosition(left: Position, right: Position) {
  return left.x === right.x && left.y === right.y
}

function initialSnake(boardSize: number): Position[] {
  const center = Math.floor(boardSize / 2)
  return [{ x: center, y: center }]
}

function normalizeFoodRoll(foodRoll: number) {
  if (!Number.isFinite(foodRoll)) return 0
  return Math.min(Math.max(foodRoll, 0), 1 - Number.EPSILON)
}

export function pickFood(
  snake: Position[],
  boardSize: number,
  foodRoll: number,
): Position | null {
  const occupied = new Set(snake.map(({ x, y }) => `${x}:${y}`))
  const emptyCells: Position[] = []

  for (let y = 0; y < boardSize; y += 1) {
    for (let x = 0; x < boardSize; x += 1) {
      if (!occupied.has(`${x}:${y}`)) emptyCells.push({ x, y })
    }
  }

  if (emptyCells.length === 0) return null

  const index = Math.floor(normalizeFoodRoll(foodRoll) * emptyCells.length)
  return emptyCells[index]
}

export function createInitialSnakeState({
  boardSize = DEFAULT_BOARD_SIZE,
  highScore = 0,
}: {
  boardSize?: number
  highScore?: number
} = {}): SnakeState {
  const snake = initialSnake(boardSize)

  return {
    boardSize,
    snake,
    food: pickFood(snake, boardSize, 0.5),
    direction: { ...INITIAL_DIRECTION },
    nextDirection: { ...INITIAL_DIRECTION },
    score: 0,
    highScore: Math.max(0, highScore),
    speed: INITIAL_SPEED,
    phase: "idle",
  }
}

export function advanceSnake(state: SnakeState, foodRoll: number): SnakeState {
  if (state.phase !== "playing") return state
  if (!state.food) return { ...state, phase: "won" }

  const direction = state.nextDirection
  const head = state.snake[0]
  const newHead = {
    x: (head.x + direction.x + state.boardSize) % state.boardSize,
    y: (head.y + direction.y + state.boardSize) % state.boardSize,
  }
  const ateFood = samePosition(newHead, state.food)

  // The tail leaves on a normal move, so it is not an obstacle unless food is eaten.
  const collisionSegments = ateFood ? state.snake : state.snake.slice(0, -1)
  if (collisionSegments.some((segment) => samePosition(segment, newHead))) {
    return {
      ...state,
      direction,
      nextDirection: direction,
      phase: "gameOver",
    }
  }

  if (!ateFood) {
    return {
      ...state,
      snake: [newHead, ...state.snake.slice(0, -1)],
      direction,
      nextDirection: direction,
    }
  }

  const snake = [newHead, ...state.snake]
  const score = state.score + POINTS_PER_FOOD
  const highScore = Math.max(state.highScore, score)
  const speed = Math.max(
    MIN_SPEED,
    INITIAL_SPEED - Math.floor(score / 50) * SPEED_STEP,
  )
  const food = pickFood(snake, state.boardSize, foodRoll)

  return {
    ...state,
    snake,
    food,
    direction,
    nextDirection: direction,
    score,
    highScore,
    speed,
    phase: food ? "playing" : "won",
  }
}

export function snakeReducer(state: SnakeState, action: SnakeAction): SnakeState {
  switch (action.type) {
    case "hydrateHighScore":
      return {
        ...state,
        highScore: Math.max(state.score, state.highScore, action.highScore),
      }
    case "start": {
      const snake = initialSnake(state.boardSize)
      const food = pickFood(snake, state.boardSize, action.foodRoll)

      return {
        ...state,
        snake,
        food,
        direction: { ...INITIAL_DIRECTION },
        nextDirection: { ...INITIAL_DIRECTION },
        score: 0,
        speed: INITIAL_SPEED,
        phase: food ? "playing" : "won",
      }
    }
    case "togglePause":
      if (state.phase === "playing") return { ...state, phase: "paused" }
      if (state.phase === "paused") return { ...state, phase: "playing" }
      return state
    case "changeDirection": {
      if (state.phase !== "playing") return state

      const isReverse =
        (action.direction.x !== 0 && action.direction.x === -state.direction.x) ||
        (action.direction.y !== 0 && action.direction.y === -state.direction.y)

      return isReverse ? state : { ...state, nextDirection: action.direction }
    }
    case "tick":
      return advanceSnake(state, action.foodRoll)
  }
}
