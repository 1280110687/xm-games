import { describe, expect, it } from "vitest"
import {
  BALL_RADIUS,
  EXTENDED_PADDLE_WIDTH,
  FIXED_TIME_STEP,
  INITIAL_LIVES,
  LEVEL_LAYOUTS,
  PADDLE_EXTENSION_DURATION,
  PADDLE_WIDTH,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  createLevelBricks,
  createNeonBreakerState,
  launchBall,
  restartNeonBreaker,
  startNextLevel,
  stepNeonBreaker,
  togglePause,
  type Brick,
  type NeonBreakerState,
  type PowerUp,
} from "./engine"

function testBrick(overrides: Partial<Brick> = {}): Brick {
  return {
    id: "test-brick",
    x: 170,
    y: 240,
    width: 40,
    height: 20,
    kind: "normal",
    hitPoints: 1,
    maxHitPoints: 1,
    ...overrides,
  }
}

function playingState(overrides: Partial<NeonBreakerState> = {}): NeonBreakerState {
  const launched = launchBall(createNeonBreakerState(), () => 0.75)
  return { ...launched, events: [], ...overrides }
}

describe("neon breaker levels", () => {
  it("builds five deterministic layouts with stable brick IDs and durability", () => {
    expect(LEVEL_LAYOUTS).toHaveLength(5)

    for (let levelIndex = 0; levelIndex < LEVEL_LAYOUTS.length; levelIndex += 1) {
      const first = createLevelBricks(levelIndex)
      const second = createLevelBricks(levelIndex)
      expect(first).toEqual(second)
      expect(first.length).toBeGreaterThan(0)
      expect(new Set(first.map((brick) => brick.id)).size).toBe(first.length)
      expect(
        first.every(
          (brick) =>
            brick.hitPoints === brick.maxHitPoints &&
            brick.hitPoints === (brick.kind === "durable" ? 2 : 1),
        ),
      ).toBe(true)
    }

    expect(createLevelBricks(1).some((brick) => brick.kind === "durable")).toBe(
      true,
    )
    expect(() => createLevelBricks(LEVEL_LAYOUTS.length)).toThrow(RangeError)
  })
})

describe("neon breaker lifecycle", () => {
  it("creates a ready 390 by 640 game with three lives", () => {
    const state = createNeonBreakerState({ highScore: 250 })

    expect(WORLD_WIDTH).toBe(390)
    expect(WORLD_HEIGHT).toBe(640)
    expect(state.phase).toBe("ready")
    expect(state.lives).toBe(INITIAL_LIVES)
    expect(state.highScore).toBe(250)
    expect(state.ball.velocity).toEqual({ x: 0, y: 0 })
    expect(state.ball.x).toBe(state.paddle.x + state.paddle.width / 2)
  })

  it("launches deterministically and pauses without advancing physics", () => {
    const launched = launchBall(createNeonBreakerState(), () => 0)
    expect(launched.phase).toBe("playing")
    expect(launched.ball.velocity.x).toBeLessThan(0)
    expect(launched.ball.velocity.y).toBeLessThan(0)
    expect(launched.events.map((event) => event.type)).toEqual(["launched"])

    const paused = togglePause(launched)
    const stepped = stepNeonBreaker(paused, 1)
    expect(stepped).toBe(paused)
    expect(stepped.ball).toEqual(paused.ball)
    expect(togglePause(paused).phase).toBe("playing")
  })

  it("moves and clamps the paddle while keeping a ready ball attached", () => {
    const initial = createNeonBreakerState()
    const right = stepNeonBreaker(initial, 1, { axis: 1 })

    expect(right.paddle.x).toBe(WORLD_WIDTH - right.paddle.width)
    expect(right.ball.x).toBe(right.paddle.x + right.paddle.width / 2)

    const left = stepNeonBreaker(right, FIXED_TIME_STEP, { targetX: -100 })
    expect(left.paddle.x).toBe(0)
    expect(left.ball.x).toBe(left.paddle.width / 2)
  })

  it("advances to the next deterministic level and preserves progress", () => {
    const cleared: NeonBreakerState = {
      ...createNeonBreakerState(),
      phase: "level-cleared",
      score: 850,
      lives: 2,
    }
    const next = startNextLevel(cleared)

    expect(next.phase).toBe("ready")
    expect(next.levelIndex).toBe(1)
    expect(next.score).toBe(850)
    expect(next.lives).toBe(2)
    expect(next.bricks).toEqual(createLevelBricks(1))
  })

  it("restarts from level one while preserving the best score", () => {
    const restarted = restartNeonBreaker(
      playingState({ levelIndex: 3, score: 900, highScore: 700, lives: 1 }),
    )

    expect(restarted.phase).toBe("ready")
    expect(restarted.levelIndex).toBe(0)
    expect(restarted.score).toBe(0)
    expect(restarted.highScore).toBe(900)
    expect(restarted.lives).toBe(INITIAL_LIVES)
  })
})

describe("neon breaker collisions", () => {
  it("bounces off walls and emits a render event", () => {
    const state = playingState({
      ball: {
        x: BALL_RADIUS + 0.5,
        y: 350,
        radius: BALL_RADIUS,
        velocity: { x: -300, y: 0 },
      },
    })
    const next = stepNeonBreaker(state, FIXED_TIME_STEP, {}, () => 1)

    expect(next.ball.x).toBeGreaterThanOrEqual(BALL_RADIUS)
    expect(next.ball.velocity.x).toBeGreaterThan(0)
    expect(next.events.some((event) => event.type === "wall-hit")).toBe(true)
  })

  it("bounces off the paddle and resets the combo", () => {
    const state = playingState({ combo: 4 })
    state.ball = {
      x: state.paddle.x + state.paddle.width / 2,
      y: state.paddle.y - BALL_RADIUS - 1,
      radius: BALL_RADIUS,
      velocity: { x: 0, y: 300 },
    }

    const next = stepNeonBreaker(state, FIXED_TIME_STEP, {}, () => 1)
    expect(next.ball.velocity.y).toBeLessThan(0)
    expect(next.combo).toBe(0)
    expect(next.events.some((event) => event.type === "paddle-hit")).toBe(true)
  })

  it("damages a durable brick, scores, and builds a combo", () => {
    const durable = testBrick({
      kind: "durable",
      hitPoints: 2,
      maxHitPoints: 2,
    })
    const state = playingState({
      bricks: [durable, testBrick({ id: "spare", x: 20 })],
      ball: {
        x: durable.x + durable.width / 2,
        y: durable.y + durable.height + BALL_RADIUS + 1,
        radius: BALL_RADIUS,
        velocity: { x: 0, y: -300 },
      },
    })

    const next = stepNeonBreaker(state, FIXED_TIME_STEP, {}, () => 1)
    expect(next.bricks.find((brick) => brick.id === durable.id)?.hitPoints).toBe(1)
    expect(next.score).toBe(25)
    expect(next.highScore).toBe(25)
    expect(next.combo).toBe(1)
    expect(next.events).toContainEqual(
      expect.objectContaining({
        type: "brick-hit",
        brickId: durable.id,
        remainingHitPoints: 1,
      }),
    )
  })

  it("subdivides a fast step so the ball cannot tunnel through a brick", () => {
    const brick = testBrick()
    const state = playingState({
      bricks: [brick, testBrick({ id: "spare", x: 20 })],
      ball: {
        x: brick.x + brick.width / 2,
        y: 360,
        radius: BALL_RADIUS,
        velocity: { x: 0, y: -1_400 },
      },
    })

    const next = stepNeonBreaker(state, 0.1, {}, () => 1)
    expect(next.bricks.some((candidate) => candidate.id === brick.id)).toBe(false)
    expect(next.ball.velocity.y).toBeGreaterThan(0)
    expect(
      next.events.some(
        (event) => event.type === "brick-destroyed" && event.brickId === brick.id,
      ),
    ).toBe(true)
  })

  it("loses lives, serves again, then reaches game over", () => {
    const missed = playingState({
      ball: {
        x: 20,
        y: WORLD_HEIGHT + BALL_RADIUS + 1,
        radius: BALL_RADIUS,
        velocity: { x: 0, y: 300 },
      },
    })
    const servedAgain = stepNeonBreaker(missed, FIXED_TIME_STEP)

    expect(servedAgain.phase).toBe("ready")
    expect(servedAgain.lives).toBe(2)
    expect(servedAgain.ball.velocity).toEqual({ x: 0, y: 0 })
    expect(servedAgain.events).toContainEqual({ type: "life-lost", lives: 2 })

    const finalMiss = stepNeonBreaker(
      {
        ...missed,
        lives: 1,
        events: [],
      },
      FIXED_TIME_STEP,
    )
    expect(finalMiss.phase).toBe("game-over")
    expect(finalMiss.lives).toBe(0)
    expect(finalMiss.events.map((event) => event.type)).toContain("game-over")
  })

  it("marks ordinary and final level completion distinctly", () => {
    const brick = testBrick()
    const ball = {
      x: brick.x + brick.width / 2,
      y: brick.y + brick.height + BALL_RADIUS + 1,
      radius: BALL_RADIUS,
      velocity: { x: 0, y: -300 },
    }

    const cleared = stepNeonBreaker(
      playingState({ bricks: [brick], ball }),
      FIXED_TIME_STEP,
      {},
      () => 1,
    )
    expect(cleared.phase).toBe("level-cleared")
    expect(cleared.events.map((event) => event.type)).toContain("level-cleared")

    const won = stepNeonBreaker(
      playingState({
        levelIndex: LEVEL_LAYOUTS.length - 1,
        bricks: [brick],
        ball,
      }),
      FIXED_TIME_STEP,
      {},
      () => 1,
    )
    expect(won.phase).toBe("won")
    expect(won.events.map((event) => event.type)).toContain("game-won")
  })
})

describe("neon breaker power-ups", () => {
  it("uses the injected random source to drop an extend-paddle power-up", () => {
    const brick = testBrick()
    const state = playingState({
      bricks: [brick, testBrick({ id: "spare", x: 20 })],
      ball: {
        x: brick.x + brick.width / 2,
        y: brick.y + brick.height + BALL_RADIUS + 1,
        radius: BALL_RADIUS,
        velocity: { x: 0, y: -300 },
      },
    })

    const next = stepNeonBreaker(state, FIXED_TIME_STEP, {}, () => 0)
    expect(next.powerUps).toHaveLength(1)
    expect(next.powerUps[0].kind).toBe("extend-paddle")
    expect(next.events.map((event) => event.type)).toContain("power-up-dropped")
  })

  it("collects and expires the paddle extension", () => {
    const initial = playingState()
    const powerUp: PowerUp = {
      id: "power-up-test",
      kind: "extend-paddle",
      x: initial.paddle.x + initial.paddle.width / 2 - 9,
      y: initial.paddle.y - 8,
      width: 18,
      height: 18,
      velocityY: 135,
    }
    const collected = stepNeonBreaker(
      { ...initial, powerUps: [powerUp] },
      FIXED_TIME_STEP,
      {},
      () => 1,
    )

    expect(collected.powerUps).toHaveLength(0)
    expect(collected.paddle.width).toBe(EXTENDED_PADDLE_WIDTH)
    expect(collected.paddleEffectRemaining).toBe(PADDLE_EXTENSION_DURATION)
    expect(collected.events.map((event) => event.type)).toContain(
      "power-up-collected",
    )

    const expired = stepNeonBreaker(
      {
        ...collected,
        paddleEffectRemaining: FIXED_TIME_STEP / 2,
        events: [],
      },
      FIXED_TIME_STEP,
      {},
      () => 1,
    )
    expect(expired.paddle.width).toBe(PADDLE_WIDTH)
    expect(expired.paddleEffectRemaining).toBe(0)
    expect(expired.events.map((event) => event.type)).toContain(
      "power-up-expired",
    )
  })
})
