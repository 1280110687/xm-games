export const WORLD_WIDTH = 390
export const WORLD_HEIGHT = 640
export const FIXED_TIME_STEP = 1 / 120

export const INITIAL_LIVES = 3
export const BALL_RADIUS = 7
export const BALL_SPEED = 310
export const PADDLE_WIDTH = 88
export const EXTENDED_PADDLE_WIDTH = 132
export const PADDLE_HEIGHT = 14
export const PADDLE_SPEED = 440
export const PADDLE_EXTENSION_DURATION = 10
export const POWER_UP_DROP_CHANCE = 0.18

const PADDLE_Y = 590
const BRICK_WIDTH = 40
const BRICK_HEIGHT = 20
const BRICK_GAP_X = 5
const BRICK_GAP_Y = 7
const BRICK_COLUMNS = 8
const BRICK_START_X =
  (WORLD_WIDTH - BRICK_COLUMNS * BRICK_WIDTH - (BRICK_COLUMNS - 1) * BRICK_GAP_X) /
  2
const BRICK_START_Y = 86
const POWER_UP_SIZE = 18
const POWER_UP_SPEED = 135
const BRICK_HIT_POINTS = 25
const BRICK_BREAK_POINTS = 75
const DURABLE_BREAK_BONUS = 25
const COMBO_BONUS = 15

/**
 * A dot is empty, 1 is a normal brick, and 2 is a two-hit durable brick.
 * Keeping the layouts as data makes level construction deterministic and easy
 * to render in a level preview without creating a game state.
 */
export const LEVEL_LAYOUTS = [
  [
    "11111111",
    "11111111",
    ".111111.",
    "..1111..",
    "...11...",
  ],
  [
    "2.1111.2",
    ".211112.",
    "..2112..",
    ".211112.",
    "2.1111.2",
  ],
  [
    "21211212",
    "12122121",
    "21211212",
    "12122121",
    "21211212",
  ],
  [
    "22222222",
    "2......2",
    "2.1111.2",
    "2.1..1.2",
    "2.1111.2",
    "2......2",
    "22222222",
  ],
  [
    "22222222",
    "22111122",
    "21222212",
    "12111121",
    "21222212",
    "22111122",
    "22222222",
  ],
] as const

export type RandomSource = () => number
export type NeonBreakerPhase =
  | "ready"
  | "playing"
  | "paused"
  | "level-cleared"
  | "won"
  | "game-over"
export type BrickKind = "normal" | "durable"
export type PowerUpKind = "extend-paddle"

export interface Vector2 {
  x: number
  y: number
}

export interface Ball extends Vector2 {
  radius: number
  velocity: Vector2
}

export interface Paddle extends Vector2 {
  width: number
  height: number
}

export interface Brick extends Vector2 {
  id: string
  width: number
  height: number
  kind: BrickKind
  hitPoints: number
  maxHitPoints: number
}

export interface PowerUp extends Vector2 {
  id: string
  kind: PowerUpKind
  width: number
  height: number
  velocityY: number
}

export type NeonBreakerEvent =
  | { type: "launched"; position: Vector2 }
  | { type: "wall-hit"; position: Vector2 }
  | { type: "paddle-hit"; position: Vector2 }
  | {
      type: "brick-hit"
      brickId: string
      position: Vector2
      remainingHitPoints: number
      combo: number
    }
  | {
      type: "brick-destroyed"
      brickId: string
      position: Vector2
      combo: number
    }
  | {
      type: "power-up-dropped"
      powerUpId: string
      position: Vector2
    }
  | {
      type: "power-up-collected"
      powerUpId: string
      position: Vector2
    }
  | { type: "power-up-expired" }
  | { type: "life-lost"; lives: number }
  | { type: "level-cleared"; levelIndex: number }
  | { type: "game-won" }
  | { type: "game-over" }

export interface NeonBreakerState {
  phase: NeonBreakerPhase
  levelIndex: number
  score: number
  highScore: number
  combo: number
  bestCombo: number
  lives: number
  elapsedTime: number
  paddle: Paddle
  ball: Ball
  bricks: Brick[]
  powerUps: PowerUp[]
  paddleEffectRemaining: number
  nextPowerUpId: number
  events: NeonBreakerEvent[]
}

export interface PaddleInput {
  /** Keyboard/gamepad direction in the inclusive range -1 to 1. */
  axis?: number
  /** Pointer position in world coordinates. Takes priority over axis. */
  targetX?: number
}

export interface CreateNeonBreakerOptions {
  highScore?: number
  levelIndex?: number
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

function normalizedRandomValue(random: RandomSource): number {
  const value = random()
  if (!Number.isFinite(value)) return 0
  return clamp(value, 0, 1 - Number.EPSILON)
}

function centerPaddle(width = PADDLE_WIDTH): Paddle {
  return {
    x: (WORLD_WIDTH - width) / 2,
    y: PADDLE_Y,
    width,
    height: PADDLE_HEIGHT,
  }
}

function ballOnPaddle(paddle: Paddle): Ball {
  return {
    x: paddle.x + paddle.width / 2,
    y: paddle.y - BALL_RADIUS - 2,
    radius: BALL_RADIUS,
    velocity: { x: 0, y: 0 },
  }
}

export function createLevelBricks(levelIndex: number): Brick[] {
  const layout = LEVEL_LAYOUTS[levelIndex]
  if (!layout) {
    throw new RangeError(`Unknown neon breaker level: ${levelIndex}`)
  }

  return layout.flatMap((row, rowIndex) =>
    [...row].flatMap((cell, columnIndex) => {
      if (cell === ".") return []

      const durable = cell === "2"
      const hitPoints = durable ? 2 : 1
      return [
        {
          id: `level-${levelIndex + 1}-brick-${rowIndex}-${columnIndex}`,
          x: BRICK_START_X + columnIndex * (BRICK_WIDTH + BRICK_GAP_X),
          y: BRICK_START_Y + rowIndex * (BRICK_HEIGHT + BRICK_GAP_Y),
          width: BRICK_WIDTH,
          height: BRICK_HEIGHT,
          kind: durable ? ("durable" as const) : ("normal" as const),
          hitPoints,
          maxHitPoints: hitPoints,
        },
      ]
    }),
  )
}

export function createNeonBreakerState(
  options: CreateNeonBreakerOptions = {},
): NeonBreakerState {
  const levelIndex = options.levelIndex ?? 0
  const paddle = centerPaddle()

  return {
    phase: "ready",
    levelIndex,
    score: 0,
    highScore: Math.max(0, options.highScore ?? 0),
    combo: 0,
    bestCombo: 0,
    lives: INITIAL_LIVES,
    elapsedTime: 0,
    paddle,
    ball: ballOnPaddle(paddle),
    bricks: createLevelBricks(levelIndex),
    powerUps: [],
    paddleEffectRemaining: 0,
    nextPowerUpId: 1,
    events: [],
  }
}

export function launchBall(
  state: NeonBreakerState,
  random: RandomSource = Math.random,
): NeonBreakerState {
  if (state.phase !== "ready") return state

  const roll = normalizedRandomValue(random)
  let horizontalRatio = (roll * 2 - 1) * 0.55
  if (Math.abs(horizontalRatio) < 0.18) {
    horizontalRatio = horizontalRatio < 0 ? -0.18 : 0.18
  }
  const speed = BALL_SPEED + state.levelIndex * 18
  const velocityX = speed * horizontalRatio
  const velocityY = -Math.sqrt(speed * speed - velocityX * velocityX)

  return {
    ...state,
    phase: "playing",
    ball: {
      ...state.ball,
      velocity: { x: velocityX, y: velocityY },
    },
    events: [
      { type: "launched", position: { x: state.ball.x, y: state.ball.y } },
    ],
  }
}

export function togglePause(state: NeonBreakerState): NeonBreakerState {
  if (state.phase === "playing") {
    return { ...state, phase: "paused", events: [] }
  }
  if (state.phase === "paused") {
    return { ...state, phase: "playing", events: [] }
  }
  return state
}

export function restartNeonBreaker(
  state: NeonBreakerState,
): NeonBreakerState {
  return createNeonBreakerState({ highScore: Math.max(state.highScore, state.score) })
}

export function startNextLevel(state: NeonBreakerState): NeonBreakerState {
  if (state.phase !== "level-cleared") return state

  const levelIndex = state.levelIndex + 1
  if (levelIndex >= LEVEL_LAYOUTS.length) {
    return { ...state, phase: "won", events: [{ type: "game-won" }] }
  }

  const paddle = centerPaddle()
  return {
    ...state,
    phase: "ready",
    levelIndex,
    combo: 0,
    paddle,
    ball: ballOnPaddle(paddle),
    bricks: createLevelBricks(levelIndex),
    powerUps: [],
    paddleEffectRemaining: 0,
    events: [],
  }
}

function copyStateForStep(state: NeonBreakerState): NeonBreakerState {
  return {
    ...state,
    paddle: { ...state.paddle },
    ball: { ...state.ball, velocity: { ...state.ball.velocity } },
    bricks: state.bricks.map((brick) => ({ ...brick })),
    powerUps: state.powerUps.map((powerUp) => ({ ...powerUp })),
    events: [],
  }
}

function applyPaddleInput(
  state: NeonBreakerState,
  deltaSeconds: number,
  input: PaddleInput,
): void {
  if (Number.isFinite(input.targetX)) {
    state.paddle.x = clamp(
      input.targetX! - state.paddle.width / 2,
      0,
      WORLD_WIDTH - state.paddle.width,
    )
    return
  }

  const axis = Number.isFinite(input.axis) ? clamp(input.axis!, -1, 1) : 0
  state.paddle.x = clamp(
    state.paddle.x + axis * PADDLE_SPEED * deltaSeconds,
    0,
    WORLD_WIDTH - state.paddle.width,
  )
}

function circleIntersectsRectangle(
  ball: Ball,
  rectangle: Pick<Brick, "x" | "y" | "width" | "height">,
): boolean {
  const closestX = clamp(ball.x, rectangle.x, rectangle.x + rectangle.width)
  const closestY = clamp(ball.y, rectangle.y, rectangle.y + rectangle.height)
  const differenceX = ball.x - closestX
  const differenceY = ball.y - closestY
  return (
    differenceX * differenceX + differenceY * differenceY <=
    ball.radius * ball.radius
  )
}

function rectangleIntersectsRectangle(
  left: Pick<PowerUp, "x" | "y" | "width" | "height">,
  right: Pick<Paddle, "x" | "y" | "width" | "height">,
): boolean {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  )
}

function collisionPosition(ball: Ball): Vector2 {
  return { x: ball.x, y: ball.y }
}

function resolveRectangleCollision(
  ball: Ball,
  rectangle: Pick<Brick, "x" | "y" | "width" | "height">,
  previousPosition: Vector2,
): void {
  const wasLeft = previousPosition.x + ball.radius <= rectangle.x
  const wasRight = previousPosition.x - ball.radius >= rectangle.x + rectangle.width
  const wasAbove = previousPosition.y + ball.radius <= rectangle.y
  const wasBelow = previousPosition.y - ball.radius >= rectangle.y + rectangle.height

  if (wasLeft) {
    ball.x = rectangle.x - ball.radius
    ball.velocity.x = -Math.abs(ball.velocity.x)
    return
  }
  if (wasRight) {
    ball.x = rectangle.x + rectangle.width + ball.radius
    ball.velocity.x = Math.abs(ball.velocity.x)
    return
  }
  if (wasAbove) {
    ball.y = rectangle.y - ball.radius
    ball.velocity.y = -Math.abs(ball.velocity.y)
    return
  }
  if (wasBelow) {
    ball.y = rectangle.y + rectangle.height + ball.radius
    ball.velocity.y = Math.abs(ball.velocity.y)
    return
  }

  const penetrationLeft = Math.abs(ball.x + ball.radius - rectangle.x)
  const penetrationRight = Math.abs(rectangle.x + rectangle.width - (ball.x - ball.radius))
  const penetrationTop = Math.abs(ball.y + ball.radius - rectangle.y)
  const penetrationBottom = Math.abs(
    rectangle.y + rectangle.height - (ball.y - ball.radius),
  )
  const smallest = Math.min(
    penetrationLeft,
    penetrationRight,
    penetrationTop,
    penetrationBottom,
  )

  if (smallest === penetrationLeft) {
    ball.x = rectangle.x - ball.radius
    ball.velocity.x = -Math.abs(ball.velocity.x)
  } else if (smallest === penetrationRight) {
    ball.x = rectangle.x + rectangle.width + ball.radius
    ball.velocity.x = Math.abs(ball.velocity.x)
  } else if (smallest === penetrationTop) {
    ball.y = rectangle.y - ball.radius
    ball.velocity.y = -Math.abs(ball.velocity.y)
  } else {
    ball.y = rectangle.y + rectangle.height + ball.radius
    ball.velocity.y = Math.abs(ball.velocity.y)
  }
}

function updateScore(state: NeonBreakerState, points: number): void {
  state.score += points
  state.highScore = Math.max(state.highScore, state.score)
}

function maybeDropPowerUp(
  state: NeonBreakerState,
  brick: Brick,
  random: RandomSource,
): void {
  if (normalizedRandomValue(random) >= POWER_UP_DROP_CHANCE) return

  const powerUp: PowerUp = {
    id: `power-up-${state.nextPowerUpId}`,
    kind: "extend-paddle",
    x: brick.x + (brick.width - POWER_UP_SIZE) / 2,
    y: brick.y + (brick.height - POWER_UP_SIZE) / 2,
    width: POWER_UP_SIZE,
    height: POWER_UP_SIZE,
    velocityY: POWER_UP_SPEED,
  }
  state.nextPowerUpId += 1
  state.powerUps.push(powerUp)
  state.events.push({
    type: "power-up-dropped",
    powerUpId: powerUp.id,
    position: { x: powerUp.x, y: powerUp.y },
  })
}

function hitBrick(
  state: NeonBreakerState,
  brickIndex: number,
  random: RandomSource,
): void {
  const brick = state.bricks[brickIndex]
  brick.hitPoints -= 1
  state.combo += 1
  state.bestCombo = Math.max(state.bestCombo, state.combo)

  const destroyed = brick.hitPoints <= 0
  const points =
    BRICK_HIT_POINTS +
    (destroyed ? BRICK_BREAK_POINTS : 0) +
    (destroyed && brick.kind === "durable" ? DURABLE_BREAK_BONUS : 0) +
    (state.combo - 1) * COMBO_BONUS
  updateScore(state, points)

  state.events.push({
    type: "brick-hit",
    brickId: brick.id,
    position: { x: brick.x + brick.width / 2, y: brick.y + brick.height / 2 },
    remainingHitPoints: Math.max(0, brick.hitPoints),
    combo: state.combo,
  })

  if (!destroyed) return

  state.events.push({
    type: "brick-destroyed",
    brickId: brick.id,
    position: { x: brick.x + brick.width / 2, y: brick.y + brick.height / 2 },
    combo: state.combo,
  })
  // A pickup cannot be collected after the board transitions away from play,
  // so avoid emitting a misleading drop event for the final brick.
  if (state.bricks.length > 1) maybeDropPowerUp(state, brick, random)
  state.bricks.splice(brickIndex, 1)

  if (state.bricks.length !== 0) return

  state.powerUps = []
  state.ball.velocity = { x: 0, y: 0 }
  if (state.levelIndex === LEVEL_LAYOUTS.length - 1) {
    state.phase = "won"
    state.events.push({ type: "game-won" })
  } else {
    state.phase = "level-cleared"
    state.events.push({ type: "level-cleared", levelIndex: state.levelIndex })
  }
}

function resolveWalls(state: NeonBreakerState): void {
  const { ball } = state
  let hitWall = false

  if (ball.x - ball.radius <= 0) {
    ball.x = ball.radius
    ball.velocity.x = Math.abs(ball.velocity.x)
    hitWall = true
  } else if (ball.x + ball.radius >= WORLD_WIDTH) {
    ball.x = WORLD_WIDTH - ball.radius
    ball.velocity.x = -Math.abs(ball.velocity.x)
    hitWall = true
  }

  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius
    ball.velocity.y = Math.abs(ball.velocity.y)
    hitWall = true
  }

  if (hitWall) {
    state.events.push({ type: "wall-hit", position: collisionPosition(ball) })
  }
}

function resolvePaddle(state: NeonBreakerState): void {
  const { ball, paddle } = state
  if (ball.velocity.y <= 0 || !circleIntersectsRectangle(ball, paddle)) return

  ball.y = paddle.y - ball.radius
  const offset = clamp(
    (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2),
    -1,
    1,
  )
  const speed = Math.max(
    BALL_SPEED + state.levelIndex * 18,
    Math.hypot(ball.velocity.x, ball.velocity.y),
  )
  const maximumBounceAngle = Math.PI / 3
  const angle = offset * maximumBounceAngle
  ball.velocity.x = Math.sin(angle) * speed
  ball.velocity.y = -Math.cos(angle) * speed
  state.combo = 0
  state.events.push({ type: "paddle-hit", position: collisionPosition(ball) })
}

function loseLife(state: NeonBreakerState): void {
  state.lives = Math.max(0, state.lives - 1)
  state.combo = 0
  state.powerUps = []
  state.paddleEffectRemaining = 0
  state.paddle.width = PADDLE_WIDTH
  state.paddle.x = clamp(
    state.paddle.x,
    0,
    WORLD_WIDTH - state.paddle.width,
  )
  state.ball = ballOnPaddle(state.paddle)
  state.events.push({ type: "life-lost", lives: state.lives })

  if (state.lives === 0) {
    state.phase = "game-over"
    state.events.push({ type: "game-over" })
  } else {
    state.phase = "ready"
  }
}

function moveBallOneSubstep(
  state: NeonBreakerState,
  deltaSeconds: number,
  random: RandomSource,
): void {
  const previousPosition = { x: state.ball.x, y: state.ball.y }
  state.ball.x += state.ball.velocity.x * deltaSeconds
  state.ball.y += state.ball.velocity.y * deltaSeconds

  resolveWalls(state)
  resolvePaddle(state)

  const brickIndex = state.bricks.findIndex((brick) =>
    circleIntersectsRectangle(state.ball, brick),
  )
  if (brickIndex >= 0) {
    const brick = state.bricks[brickIndex]
    resolveRectangleCollision(state.ball, brick, previousPosition)
    hitBrick(state, brickIndex, random)
  }

  if (state.phase === "playing" && state.ball.y - state.ball.radius > WORLD_HEIGHT) {
    loseLife(state)
  }
}

function updatePowerUps(state: NeonBreakerState, deltaSeconds: number): void {
  for (let index = state.powerUps.length - 1; index >= 0; index -= 1) {
    const powerUp = state.powerUps[index]
    powerUp.y += powerUp.velocityY * deltaSeconds

    if (rectangleIntersectsRectangle(powerUp, state.paddle)) {
      state.powerUps.splice(index, 1)
      const center = state.paddle.x + state.paddle.width / 2
      state.paddle.width = EXTENDED_PADDLE_WIDTH
      state.paddle.x = clamp(
        center - state.paddle.width / 2,
        0,
        WORLD_WIDTH - state.paddle.width,
      )
      state.paddleEffectRemaining = PADDLE_EXTENSION_DURATION
      state.events.push({
        type: "power-up-collected",
        powerUpId: powerUp.id,
        position: { x: powerUp.x, y: powerUp.y },
      })
    } else if (powerUp.y > WORLD_HEIGHT) {
      state.powerUps.splice(index, 1)
    }
  }
}

function updatePaddleEffect(state: NeonBreakerState, deltaSeconds: number): void {
  if (state.paddleEffectRemaining <= 0) return

  state.paddleEffectRemaining = Math.max(
    0,
    state.paddleEffectRemaining - deltaSeconds,
  )
  if (state.paddleEffectRemaining > 0) return

  const center = state.paddle.x + state.paddle.width / 2
  state.paddle.width = PADDLE_WIDTH
  state.paddle.x = clamp(
    center - state.paddle.width / 2,
    0,
    WORLD_WIDTH - state.paddle.width,
  )
  state.events.push({ type: "power-up-expired" })
}

/**
 * Advances one caller-controlled time step. Pixi's ticker should accumulate
 * elapsed time and call this with FIXED_TIME_STEP. The engine also subdivides
 * fast movement so a ball cannot jump through a thin brick in one step.
 */
export function stepNeonBreaker(
  state: NeonBreakerState,
  deltaSeconds: number,
  input: PaddleInput = {},
  random: RandomSource = Math.random,
): NeonBreakerState {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
    return state.events.length === 0 ? state : { ...state, events: [] }
  }
  if (state.phase === "paused") {
    return state.events.length === 0 ? state : { ...state, events: [] }
  }
  if (
    state.phase === "level-cleared" ||
    state.phase === "won" ||
    state.phase === "game-over"
  ) {
    return state.events.length === 0 ? state : { ...state, events: [] }
  }

  const next = copyStateForStep(state)
  applyPaddleInput(next, deltaSeconds, input)

  if (next.phase === "ready") {
    next.ball = ballOnPaddle(next.paddle)
    return next
  }

  next.elapsedTime += deltaSeconds
  updatePaddleEffect(next, deltaSeconds)

  const maximumDisplacement = Math.max(
    Math.abs(next.ball.velocity.x),
    Math.abs(next.ball.velocity.y),
  ) * deltaSeconds
  const substepCount = Math.max(
    1,
    Math.ceil(maximumDisplacement / (next.ball.radius * 0.5)),
  )
  const substepDuration = deltaSeconds / substepCount

  for (let index = 0; index < substepCount; index += 1) {
    if (next.phase !== "playing") break
    moveBallOneSubstep(next, substepDuration, random)
    if (next.phase === "playing") updatePowerUps(next, substepDuration)
  }

  return next
}
