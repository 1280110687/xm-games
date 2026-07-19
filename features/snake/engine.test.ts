import { describe, expect, it } from "vitest"

import {
  advanceSnake,
  createInitialSnakeState,
  pickFood,
  type Position,
  type SnakeState,
} from "./engine"

function playingState(overrides: Partial<SnakeState>): SnakeState {
  return {
    ...createInitialSnakeState({ boardSize: 4 }),
    phase: "playing",
    ...overrides,
  }
}

describe("advanceSnake", () => {
  it("allows moving into the tail cell when the tail is about to leave", () => {
    const direction: Position = { x: -1, y: 0 }
    const state = playingState({
      snake: [
        { x: 1, y: 1 },
        { x: 1, y: 2 },
        { x: 0, y: 2 },
        { x: 0, y: 1 },
      ],
      food: { x: 3, y: 3 },
      direction,
      nextDirection: direction,
    })

    const next = advanceSnake(state, 0)

    expect(next.phase).toBe("playing")
    expect(next.snake).toEqual([
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 0, y: 2 },
    ])
  })

  it("ends the game when moving into a non-tail body segment", () => {
    const direction: Position = { x: 1, y: 0 }
    const state = playingState({
      snake: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 2, y: 2 },
        { x: 1, y: 2 },
      ],
      food: { x: 3, y: 3 },
      direction,
      nextDirection: direction,
    })

    const next = advanceSnake(state, 0)

    expect(next.phase).toBe("gameOver")
    expect(next.snake).toEqual(state.snake)
  })

  it("finishes with a win after eating the board's final empty cell", () => {
    const direction: Position = { x: 1, y: 0 }
    const state = playingState({
      boardSize: 2,
      snake: [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ],
      food: { x: 1, y: 0 },
      direction,
      nextDirection: direction,
    })

    const next = advanceSnake(state, 0.75)

    expect(next.phase).toBe("won")
    expect(next.food).toBeNull()
    expect(next.snake).toHaveLength(4)
  })
})

describe("pickFood", () => {
  it("returns the only empty cell without retrying", () => {
    const snake = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ]

    expect(pickFood(snake, 2, 0.99)).toEqual({ x: 1, y: 1 })
  })

  it("returns null for a full board", () => {
    const snake = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]

    expect(pickFood(snake, 2, 0.5)).toBeNull()
  })
})
