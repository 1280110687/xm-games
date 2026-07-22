import {
  Application,
  Container,
  Graphics,
  Rectangle,
  UPDATE_PRIORITY,
  type FederatedPointerEvent,
  type Ticker,
} from "pixi.js"

import {
  FIXED_TIME_STEP,
  LEVEL_LAYOUTS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  createNeonBreakerState,
  launchBall,
  restartNeonBreaker,
  startNextLevel,
  stepNeonBreaker,
  togglePause,
  type NeonBreakerEvent,
  type NeonBreakerPhase,
  type NeonBreakerState,
  type Vector2,
} from "./engine"

const MAX_FIXED_STEPS = 12
const POWER_UP_POOL_SIZE = 16
const PARTICLE_POOL_SIZE = 96
const BALL_TRAIL_SIZE = 7

const LEVEL_COLORS = [
  0x22d3ee,
  0xa78bfa,
  0xf472b6,
  0x34d399,
  0xfbbf24,
] as const

const STOPPED_PHASES: NeonBreakerPhase[] = [
  "paused",
  "level-cleared",
  "won",
  "game-over",
]

export interface NeonBreakerSnapshot {
  phase: NeonBreakerPhase
  levelIndex: number
  levelCount: number
  score: number
  highScore: number
  combo: number
  bestCombo: number
  lives: number
  bricksLeft: number
  widePaddleSeconds: number
}

export interface NeonBreakerController {
  launch: () => void
  pause: () => void
  resume: () => void
  restart: () => void
  nextLevel: () => void
  setReducedMotion: (reduced: boolean) => void
  destroy: () => void
}

interface CreateNeonBreakerSceneOptions {
  host: HTMLDivElement
  highScore?: number
  reducedMotion?: boolean
  signal?: AbortSignal
  onSnapshot: (snapshot: NeonBreakerSnapshot) => void
}

interface BrickView {
  graphic: Graphics
  brickId: string | null
  hitPoints: number
}

interface ParticleView {
  graphic: Graphics
  active: boolean
  velocityX: number
  velocityY: number
  life: number
  maxLife: number
}

function snapshotFromState(state: NeonBreakerState): NeonBreakerSnapshot {
  return {
    phase: state.phase,
    levelIndex: state.levelIndex,
    levelCount: LEVEL_LAYOUTS.length,
    score: state.score,
    highScore: state.highScore,
    combo: state.combo,
    bestCombo: state.bestCombo,
    lives: state.lives,
    bricksLeft: state.bricks.length,
    widePaddleSeconds: Math.ceil(state.paddleEffectRemaining),
  }
}

function snapshotSignature(snapshot: NeonBreakerSnapshot) {
  return [
    snapshot.phase,
    snapshot.levelIndex,
    snapshot.score,
    snapshot.highScore,
    snapshot.combo,
    snapshot.bestCombo,
    snapshot.lives,
    snapshot.bricksLeft,
    snapshot.widePaddleSeconds,
  ].join(":")
}

function drawBackground(graphic: Graphics) {
  graphic
    .roundRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 28)
    .fill({ color: 0x050816 })
    .stroke({ color: 0x6366f1, alpha: 0.34, width: 2 })

  for (let x = 30; x < WORLD_WIDTH; x += 42) {
    graphic
      .moveTo(x, 16)
      .lineTo(x, WORLD_HEIGHT - 16)
      .stroke({ color: 0x818cf8, alpha: 0.035, width: 1 })
  }

  for (let y = 28; y < WORLD_HEIGHT; y += 42) {
    graphic
      .moveTo(16, y)
      .lineTo(WORLD_WIDTH - 16, y)
      .stroke({ color: 0x22d3ee, alpha: 0.035, width: 1 })
  }

  for (let index = 0; index < 34; index += 1) {
    const x = 18 + ((index * 83) % (WORLD_WIDTH - 36))
    const y = 22 + ((index * 137) % (WORLD_HEIGHT - 44))
    const radius = index % 4 === 0 ? 1.5 : 0.8
    graphic.circle(x, y, radius).fill({
      color: index % 3 === 0 ? 0x22d3ee : 0xa78bfa,
      alpha: index % 5 === 0 ? 0.42 : 0.22,
    })
  }
}

function drawBrick(
  graphic: Graphics,
  width: number,
  height: number,
  color: number,
  durable: boolean,
  damaged: boolean,
) {
  graphic.clear()
  graphic
    .roundRect(-2, -2, width + 4, height + 4, 7)
    .fill({ color, alpha: 0.16 })
    .roundRect(0, 0, width, height, 5)
    .fill({ color, alpha: damaged ? 0.5 : durable ? 0.82 : 0.72 })
    .stroke({ color: 0xffffff, alpha: durable ? 0.66 : 0.38, width: durable ? 1.7 : 1 })

  if (durable && !damaged) {
    graphic
      .roundRect(5, 4, width - 10, 4, 2)
      .fill({ color: 0xffffff, alpha: 0.34 })
  }
}

function drawPaddle(graphic: Graphics, width: number) {
  graphic.clear()
  graphic
    .roundRect(-4, -4, width + 8, 22, 11)
    .fill({ color: 0x22d3ee, alpha: 0.12 })
    .roundRect(0, 0, width, 14, 7)
    .fill({ color: 0x67e8f9, alpha: 0.94 })
    .stroke({ color: 0xffffff, alpha: 0.82, width: 1.2 })
    .roundRect(8, 3, Math.max(8, width - 16), 3, 2)
    .fill({ color: 0xffffff, alpha: 0.4 })
}

function drawBall(graphic: Graphics) {
  graphic
    .circle(0, 0, 13)
    .fill({ color: 0x22d3ee, alpha: 0.08 })
    .circle(0, 0, 9.5)
    .fill({ color: 0xa5f3fc, alpha: 0.2 })
    .circle(0, 0, 7)
    .fill({ color: 0xffffff })
    .circle(-2, -2, 2.4)
    .fill({ color: 0xc4b5fd, alpha: 0.9 })
}

function drawPowerUp(graphic: Graphics) {
  graphic
    .circle(9, 9, 12)
    .fill({ color: 0x34d399, alpha: 0.14 })
    .roundRect(0, 0, 18, 18, 5)
    .fill({ color: 0x34d399, alpha: 0.9 })
    .stroke({ color: 0xffffff, alpha: 0.72, width: 1 })
    .roundRect(3, 7, 12, 4, 2)
    .fill({ color: 0xffffff, alpha: 0.9 })
}

function particleColorForLevel(levelIndex: number) {
  return LEVEL_COLORS[levelIndex % LEVEL_COLORS.length]
}

export async function createNeonBreakerScene({
  host,
  highScore = 0,
  reducedMotion = false,
  signal,
  onSnapshot,
}: CreateNeonBreakerSceneOptions): Promise<NeonBreakerController> {
  const app = new Application()
  const initialWidth = Math.max(1, Math.floor(host.clientWidth))
  const initialHeight = Math.max(1, Math.floor(host.clientHeight))
  const initialResolution = Math.min(
    2,
    Math.max(1, window.devicePixelRatio || 1),
  )

  await app.init({
    width: initialWidth,
    height: initialHeight,
    background: 0x050816,
    backgroundAlpha: 1,
    antialias: true,
    resolution: initialResolution,
    autoDensity: true,
    autoStart: false,
    sharedTicker: false,
    preference: ["webgl", "canvas"],
    powerPreference: "high-performance",
  })

  if (signal?.aborted) {
    app.destroy({ removeView: true }, { children: true, context: true })
    throw new DOMException("Neon Breaker initialization aborted", "AbortError")
  }

  let destroyed = false
  let state = createNeonBreakerState({ highScore })
  let accumulator = 0
  let pointerTargetX: number | undefined
  let pointerActive = false
  let leftPressed = false
  let rightPressed = false
  let currentReducedMotion = reducedMotion
  let lastSnapshotSignature = ""
  let lastPaddleWidth = -1
  let particleCursor = 0
  let shakeRemaining = 0
  let worldOffsetX = 0
  let worldOffsetY = 0
  const trailHistory: Vector2[] = []

  app.canvas.style.display = "block"
  app.canvas.style.width = "100%"
  app.canvas.style.height = "100%"
  app.canvas.style.touchAction = "pan-y"
  app.canvas.setAttribute("aria-hidden", "true")
  host.replaceChildren(app.canvas)

  const worldRoot = new Container()
  const background = new Graphics()
  const camera = new Container()
  const brickLayer = new Container()
  const trailLayer = new Container()
  const powerUpLayer = new Container()
  const particleLayer = new Container()
  const paddleView = new Graphics()
  const ballView = new Graphics()
  const inputSurface = new Graphics()

  drawBackground(background)
  drawBall(ballView)
  inputSurface
    .rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
    .fill({ color: 0xffffff, alpha: 0.001 })
  inputSurface.eventMode = "static"
  inputSurface.hitArea = new Rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
  inputSurface.cursor = "crosshair"

  camera.eventMode = "none"
  camera.addChild(brickLayer, trailLayer, paddleView, ballView, powerUpLayer, particleLayer)
  worldRoot.addChild(background, camera, inputSurface)
  app.stage.addChild(worldRoot)

  const maximumBrickCount = Math.max(
    ...LEVEL_LAYOUTS.map((layout) =>
      layout.reduce(
        (total, row) => total + [...row].filter((cell) => cell !== ".").length,
        0,
      ),
    ),
  )
  const brickViews: BrickView[] = Array.from(
    { length: maximumBrickCount },
    () => {
      const graphic = new Graphics()
      graphic.visible = false
      brickLayer.addChild(graphic)
      return { graphic, brickId: null, hitPoints: -1 }
    },
  )
  const powerUpViews = Array.from({ length: POWER_UP_POOL_SIZE }, () => {
    const graphic = new Graphics()
    drawPowerUp(graphic)
    graphic.visible = false
    powerUpLayer.addChild(graphic)
    return graphic
  })
  const particleViews: ParticleView[] = Array.from(
    { length: PARTICLE_POOL_SIZE },
    () => {
      const graphic = new Graphics()
      graphic.visible = false
      particleLayer.addChild(graphic)
      return {
        graphic,
        active: false,
        velocityX: 0,
        velocityY: 0,
        life: 0,
        maxLife: 0,
      }
    },
  )
  const trailViews = Array.from({ length: BALL_TRAIL_SIZE }, (_, index) => {
    const graphic = new Graphics()
      .circle(0, 0, Math.max(1.4, 5.4 - index * 0.55))
      .fill({ color: 0x67e8f9, alpha: Math.max(0.04, 0.18 - index * 0.02) })
    graphic.visible = false
    trailLayer.addChild(graphic)
    return graphic
  })

  const publishSnapshot = (force = false) => {
    if (destroyed) return
    const snapshot = snapshotFromState(state)
    const signature = snapshotSignature(snapshot)
    if (!force && signature === lastSnapshotSignature) return
    lastSnapshotSignature = signature
    onSnapshot(snapshot)
  }

  const spawnParticles = (
    position: Vector2,
    color: number,
    count: number,
    speed = 120,
  ) => {
    const actualCount = currentReducedMotion ? Math.min(3, count) : count

    for (let index = 0; index < actualCount; index += 1) {
      const particle = particleViews[particleCursor]
      particleCursor = (particleCursor + 1) % particleViews.length
      const angle = (Math.PI * 2 * index) / actualCount + Math.random() * 0.45
      const velocity = speed * (0.45 + Math.random() * 0.75)
      const life = 0.24 + Math.random() * 0.34

      particle.active = true
      particle.life = life
      particle.maxLife = life
      particle.velocityX = Math.cos(angle) * velocity
      particle.velocityY = Math.sin(angle) * velocity
      particle.graphic
        .clear()
        .circle(0, 0, 1.6 + Math.random() * 2.2)
        .fill({ color, alpha: 0.92 })
      particle.graphic.position.set(position.x, position.y)
      particle.graphic.scale.set(1)
      particle.graphic.alpha = 1
      particle.graphic.visible = true
    }
  }

  const processEvents = (events: NeonBreakerEvent[]) => {
    const levelColor = particleColorForLevel(state.levelIndex)

    for (const event of events) {
      switch (event.type) {
        case "launched":
          spawnParticles(event.position, 0xffffff, 6, 80)
          break
        case "wall-hit":
          spawnParticles(event.position, 0x67e8f9, 3, 70)
          break
        case "paddle-hit":
          spawnParticles(event.position, 0xa5f3fc, 5, 90)
          break
        case "brick-hit":
          spawnParticles(event.position, levelColor, 5, 105)
          break
        case "brick-destroyed":
          spawnParticles(event.position, levelColor, 11, 145)
          shakeRemaining = currentReducedMotion ? 0 : 0.07
          break
        case "power-up-dropped":
          spawnParticles(event.position, 0x34d399, 6, 85)
          break
        case "power-up-collected":
          spawnParticles(event.position, 0x6ee7b7, 14, 145)
          shakeRemaining = currentReducedMotion ? 0 : 0.1
          break
        case "life-lost":
          spawnParticles({ x: state.ball.x, y: WORLD_HEIGHT - 24 }, 0xfb7185, 18, 165)
          shakeRemaining = currentReducedMotion ? 0 : 0.22
          break
        case "level-cleared":
        case "game-won":
          spawnParticles({ x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 }, 0xfbbf24, 30, 210)
          shakeRemaining = currentReducedMotion ? 0 : 0.18
          break
        case "game-over":
          shakeRemaining = currentReducedMotion ? 0 : 0.28
          break
        case "power-up-expired":
          spawnParticles(
            { x: state.paddle.x + state.paddle.width / 2, y: state.paddle.y },
            0x94a3b8,
            5,
            70,
          )
          break
      }
    }
  }

  const syncBricks = () => {
    const levelColor = particleColorForLevel(state.levelIndex)

    for (let index = 0; index < brickViews.length; index += 1) {
      const pooled = brickViews[index]
      const brick = state.bricks[index]

      if (!brick) {
        pooled.graphic.visible = false
        pooled.brickId = null
        pooled.hitPoints = -1
        continue
      }

      if (
        pooled.brickId !== brick.id
        || pooled.hitPoints !== brick.hitPoints
      ) {
        drawBrick(
          pooled.graphic,
          brick.width,
          brick.height,
          levelColor,
          brick.kind === "durable",
          brick.hitPoints < brick.maxHitPoints,
        )
        pooled.brickId = brick.id
        pooled.hitPoints = brick.hitPoints
      }

      pooled.graphic.position.set(brick.x, brick.y)
      pooled.graphic.visible = true
    }
  }

  const syncPowerUps = () => {
    for (let index = 0; index < powerUpViews.length; index += 1) {
      const powerUp = state.powerUps[index]
      const view = powerUpViews[index]
      if (!powerUp) {
        view.visible = false
        continue
      }
      view.position.set(powerUp.x, powerUp.y)
      view.rotation = state.elapsedTime * 1.8 + index
      view.pivot.set(9, 9)
      view.visible = true
    }
  }

  const syncStateGraphics = () => {
    syncBricks()
    syncPowerUps()

    if (lastPaddleWidth !== state.paddle.width) {
      drawPaddle(paddleView, state.paddle.width)
      lastPaddleWidth = state.paddle.width
    }
    paddleView.position.set(state.paddle.x, state.paddle.y)
    ballView.position.set(state.ball.x, state.ball.y)

    if (state.phase === "playing") {
      trailHistory.unshift({ x: state.ball.x, y: state.ball.y })
      trailHistory.length = Math.min(trailHistory.length, trailViews.length)
    } else {
      trailHistory.length = 0
    }

    for (let index = 0; index < trailViews.length; index += 1) {
      const position = trailHistory[index]
      trailViews[index].visible = Boolean(position)
      if (position) trailViews[index].position.set(position.x, position.y)
    }
  }

  const updateParticles = (deltaSeconds: number) => {
    for (const particle of particleViews) {
      if (!particle.active) continue
      particle.life -= deltaSeconds
      if (particle.life <= 0) {
        particle.active = false
        particle.graphic.visible = false
        continue
      }

      particle.velocityY += 115 * deltaSeconds
      particle.graphic.x += particle.velocityX * deltaSeconds
      particle.graphic.y += particle.velocityY * deltaSeconds
      const progress = particle.life / particle.maxLife
      particle.graphic.alpha = progress
      particle.graphic.scale.set(0.55 + progress * 0.55)
    }
  }

  const updateShake = (deltaSeconds: number) => {
    if (shakeRemaining <= 0 || currentReducedMotion) {
      camera.position.set(0, 0)
      return
    }

    shakeRemaining = Math.max(0, shakeRemaining - deltaSeconds)
    const strength = 3.6 * Math.min(1, shakeRemaining / 0.08)
    camera.position.set(
      (Math.random() - 0.5) * strength,
      (Math.random() - 0.5) * strength,
    )
  }

  const renderStoppedFrame = () => {
    syncStateGraphics()
    publishSnapshot()
    if (!destroyed) app.render()
  }

  const syncTickerWithPhase = () => {
    if (STOPPED_PHASES.includes(state.phase)) {
      app.stop()
      renderStoppedFrame()
      return
    }

    accumulator = 0
    if (!app.ticker.started) app.start()
  }

  const tick = (ticker: Ticker) => {
    if (destroyed) return
    const deltaSeconds = Math.min(ticker.deltaMS / 1000, 0.1)
    accumulator = Math.min(
      accumulator + deltaSeconds,
      FIXED_TIME_STEP * MAX_FIXED_STEPS,
    )

    const axis = Number(rightPressed) - Number(leftPressed)
    let steps = 0
    while (
      accumulator >= FIXED_TIME_STEP
      && steps < MAX_FIXED_STEPS
    ) {
      state = stepNeonBreaker(
        state,
        FIXED_TIME_STEP,
        pointerTargetX === undefined
          ? { axis }
          : { targetX: pointerTargetX },
      )
      if (state.events.length > 0) processEvents(state.events)
      accumulator -= FIXED_TIME_STEP
      steps += 1
    }

    updateParticles(deltaSeconds)
    updateShake(deltaSeconds)
    syncStateGraphics()
    publishSnapshot()

    if (STOPPED_PHASES.includes(state.phase)) {
      app.stop()
      app.render()
    }
  }

  const updatePointerTarget = (event: FederatedPointerEvent) => {
    const local = event.getLocalPosition(worldRoot)
    pointerTargetX = Math.min(Math.max(local.x, 0), WORLD_WIDTH)
  }

  const handlePointerDown = (event: FederatedPointerEvent) => {
    pointerActive = true
    updatePointerTarget(event)
    host.focus({ preventScroll: true })
  }
  const handlePointerMove = (event: FederatedPointerEvent) => {
    if (pointerActive || event.pointerType === "mouse") {
      updatePointerTarget(event)
    }
  }
  const handlePointerUp = () => {
    pointerActive = false
  }

  inputSurface.on("pointerdown", handlePointerDown)
  inputSurface.on("globalpointermove", handlePointerMove)
  inputSurface.on("pointerup", handlePointerUp)
  inputSurface.on("pointerupoutside", handlePointerUp)
  inputSurface.on("pointercancel", handlePointerUp)

  const handleKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase()
    if (key === "arrowleft" || key === "a") {
      event.preventDefault()
      pointerTargetX = undefined
      leftPressed = true
      return
    }
    if (key === "arrowright" || key === "d") {
      event.preventDefault()
      pointerTargetX = undefined
      rightPressed = true
      return
    }
    if ((key === " " || key === "enter") && !event.repeat) {
      event.preventDefault()
      if (state.phase === "ready") {
        state = launchBall(state)
      } else if (state.phase === "playing" || state.phase === "paused") {
        state = togglePause(state)
      } else if (state.phase === "level-cleared") {
        state = startNextLevel(state)
      } else if (state.phase === "won" || state.phase === "game-over") {
        state = restartNeonBreaker(state)
      }
      processEvents(state.events)
      syncStateGraphics()
      publishSnapshot(true)
      syncTickerWithPhase()
    }
  }
  const handleKeyUp = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase()
    if (key === "arrowleft" || key === "a") leftPressed = false
    if (key === "arrowright" || key === "d") rightPressed = false
  }
  const clearInput = () => {
    leftPressed = false
    rightPressed = false
    pointerActive = false
  }

  host.addEventListener("keydown", handleKeyDown)
  host.addEventListener("keyup", handleKeyUp)
  host.addEventListener("blur", clearInput)

  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      clearInput()
      if (state.phase === "playing") state = togglePause(state)
      app.stop()
      renderStoppedFrame()
      return
    }

    if (state.phase === "ready" && !app.ticker.started) app.start()
  }
  document.addEventListener("visibilitychange", handleVisibilityChange)

  const resize = () => {
    if (destroyed) return
    const width = Math.max(1, Math.floor(host.clientWidth))
    const height = Math.max(1, Math.floor(host.clientHeight))
    const resolution = Math.min(
      2,
      Math.max(1, window.devicePixelRatio || 1),
    )
    app.renderer.resize(width, height, resolution)

    const scale = Math.min(width / WORLD_WIDTH, height / WORLD_HEIGHT)
    worldOffsetX = (width - WORLD_WIDTH * scale) / 2
    worldOffsetY = (height - WORLD_HEIGHT * scale) / 2
    worldRoot.scale.set(scale)
    worldRoot.position.set(worldOffsetX, worldOffsetY)
    app.stage.hitArea = new Rectangle(0, 0, width, height)

    if (!app.ticker.started) app.render()
  }
  let resizeObserver: ResizeObserver | null = null
  const destroyScene = () => {
    if (destroyed) return
    destroyed = true
    document.removeEventListener("visibilitychange", handleVisibilityChange)
    window.removeEventListener("resize", resize)
    resizeObserver?.disconnect()
    host.removeEventListener("keydown", handleKeyDown)
    host.removeEventListener("keyup", handleKeyUp)
    host.removeEventListener("blur", clearInput)
    inputSurface.off("pointerdown", handlePointerDown)
    inputSurface.off("globalpointermove", handlePointerMove)
    inputSurface.off("pointerup", handlePointerUp)
    inputSurface.off("pointerupoutside", handlePointerUp)
    inputSurface.off("pointercancel", handlePointerUp)
    app.stop()
    app.ticker.remove(tick)
    app.destroy(
      { removeView: true },
      {
        children: true,
        context: true,
        texture: false,
        textureSource: false,
      },
    )
  }

  try {
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
    window.addEventListener("resize", resize)

    app.ticker.maxFPS = 60
    app.ticker.add(tick, undefined, UPDATE_PRIORITY.HIGH)
    resize()
    syncStateGraphics()
    publishSnapshot(true)
    app.render()
    app.start()
  } catch (error) {
    destroyScene()
    throw error
  }

  const applyCommand = (
    update: (current: NeonBreakerState) => NeonBreakerState,
  ) => {
    if (destroyed) return
    const next = update(state)
    if (next === state) return
    state = next
    if (state.events.length > 0) processEvents(state.events)
    syncStateGraphics()
    publishSnapshot(true)
    syncTickerWithPhase()
  }

  return {
    launch: () => applyCommand((current) => launchBall(current)),
    pause: () => {
      if (state.phase === "playing") {
        applyCommand((current) => togglePause(current))
      }
    },
    resume: () => {
      if (state.phase === "paused") {
        applyCommand((current) => togglePause(current))
      }
    },
    restart: () => applyCommand((current) => restartNeonBreaker(current)),
    nextLevel: () => applyCommand((current) => startNextLevel(current)),
    setReducedMotion: (reduced) => {
      currentReducedMotion = reduced
      if (reduced) {
        shakeRemaining = 0
        camera.position.set(0, 0)
      }
    },
    destroy: destroyScene,
  }
}
