// XM Games integration of tailuge/billiards (GPL-3.0). See ../LICENSE.
import { Color, type Mesh, type Material } from 'three'
import { Container } from '../upstream/src/container/container'
import { Session } from '../upstream/src/network/client/session'
import { Assets } from '../upstream/src/view/assets'
import { Keyboard } from '../upstream/src/events/keyboard'
import { BreakEvent } from '../upstream/src/events/breakevent'
import { EventUtil } from '../upstream/src/events/eventutil'
import { BotRelay } from '../upstream/src/network/bot/botrelay'
import { Logger } from '../upstream/src/network/bot/logger'
import { Input } from '../upstream/src/events/input'
import { t, setLocale } from '../upstream/src/utils/i18n'

const THEMES = ['theme-pocket', 'theme-three', 'theme-four', 'theme-retro']
const LOCALES = ['zh', 'en', 'th']
const params = new URLSearchParams(location.hash.slice(1))
const bot = params.get('mode') === 'bot'
// Ignore arbitrary remote/game URL options. Only the two local modes are exposed.
history.replaceState(null, '', `${location.pathname}${bot ? '?bot=TheFarJaw' : ''}#mode=${bot ? 'bot' : 'practice'}`)
Session.init('xm-player', '', 'xm-local-table', false, bot, false, !bot, 4, true)
const assets = new Assets('eightball')
assets.createLocal(false)
const viewport = document.getElementById('viewP1')!
let game: Container
let hostPaused = false
let currentLocale = 'en'
let lastController = ''
let started = false
let stateTimer: ReturnType<typeof setInterval>

type Palette = { canvas: number; accent: number; ink: number; muted: number; border: number; light: number; canvasGrid: number; surface: number; onAccent: number }
const cssColor = (color: number) => `#${color.toString(16).padStart(6, '0')}`
function validPalette(value: unknown): value is Palette {
  if (!value || typeof value !== 'object') return false
  return ['canvas', 'accent', 'ink', 'muted', 'border', 'light', 'canvasGrid', 'surface', 'onAccent'].every(key => {
    const color = (value as Record<string, unknown>)[key]
    return Number.isInteger(color) && Number(color) >= 0 && Number(color) <= 0xffffff
  })
}
function post(type: string, extra: object = {}) {
  if (parent !== window) parent.postMessage({ channel: 'xm-billiards', type, ...extra }, location.origin)
}
function updateCopy() {
  document.documentElement.lang = currentLocale
  document.getElementById('powerLabel')!.textContent = t('Power')
  document.getElementById('cuePower')!.setAttribute('aria-label', t('Shot power'))
  document.getElementById('aimLeft')!.setAttribute('aria-label', t('Aim left'))
  document.getElementById('aimRight')!.setAttribute('aria-label', t('Aim right'))
  document.getElementById('camera')!.setAttribute('aria-label', t('Change camera'))
  viewport.setAttribute('aria-label', t('Billiards table'))
  document.getElementById('paused')!.textContent = t('Paused')
  const phase = game?.controller?.name
  document.getElementById('instruction')!.textContent = phase === 'PlaceBall'
    ? t('Drag to place the cue ball, then confirm.')
    : phase === 'WatchAim' || phase === 'WatchShot'
      ? t('Computer is playing…')
      : phase === 'PlayShot'
        ? t('Balls are moving…')
        : t('Drag to aim. Set power, then shoot.')
  const hit = document.getElementById('cueHit')!
  const label = t(phase === 'PlaceBall' ? 'Place\nBall' : 'Hit')
  hit.textContent = label
  hit.setAttribute('aria-label', label)
}
function applyContext(value: unknown) {
  if (!value || typeof value !== 'object') return
  const data = value as Record<string, unknown>
  if (!THEMES.includes(String(data.theme)) || !LOCALES.includes(String(data.locale)) || !validPalette(data.palette)) return
  const palette = data.palette
  document.documentElement.dataset.theme = String(data.theme)
  currentLocale = String(data.locale)
  setLocale(currentLocale)
  const root = document.documentElement.style
  for (const [name, value] of Object.entries({canvas:palette.canvas,panel:palette.surface,ink:palette.ink,muted:palette.muted,border:palette.border,accent:palette.accent,'on-accent':palette.onAccent})) root.setProperty(`--${name}`,cssColor(value))
  const cloth = new Color(palette.accent).lerp(new Color(palette.canvas), .3)
  const cushion = new Color(palette.accent).multiplyScalar(.68)
  assets.table.traverse(object => {
    const mesh = object as Mesh
    if (!mesh.isMesh) return
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    materials.forEach((material: Material & {color?: Color}) => {
      if (material.name === 'xm-cloth') material.color?.copy(cloth)
      else if (material.name === 'xm-cushion') material.color?.copy(cushion)
      else if (material.name === 'xm-pocket') material.color?.setHex(0x101720)
      else if (material.name === 'xm-frame') material.color?.setHex(palette.border)
    })
  })
  game.view.scene.background = new Color(palette.canvas)
  game.lastEventTime = performance.now()
  game.view.render()
  updateCopy()
}
function pause() {
  const paused = hostPaused || document.hidden
  game?.setPaused(paused)
  document.body.classList.toggle('paused', paused)
  document.getElementById('paused')!.hidden = !paused
}
window.addEventListener('message', event => {
  if (event.source !== parent || event.origin !== location.origin || event.data?.channel !== 'xm-billiards') return
  if (event.data.type === 'ping') { post(started ? 'ready' : 'error'); return }
  if (event.data.type === 'context') applyContext(event.data)
  if (event.data.type === 'pause' && typeof event.data.paused === 'boolean') { hostPaused = event.data.paused; pause() }
})
document.addEventListener('visibilitychange', pause)

try {
  game = new Container({ element: viewport, assets, ruletype: 'eightball', keyboard: new Keyboard(viewport as HTMLCanvasElement), log: () => {}, isSinglePlayer: !bot, botMode: bot, portraitMode: {roomVisible:false, singlePlayer:!bot} })
  if (bot) {
    const relay = new BotRelay(new Logger(), game)
    game.relay = relay
    game.broadcast = event => {
      event.clientId = Session.getInstance().clientId
      event.playername = ''
      relay.publish('xm-local-table', EventUtil.serialise(event))
    }
    relay.subscribe('xm-local-table', text => game.eventQueue.push(EventUtil.fromSerialised(text)))
  } else game.eventQueue.push(new BreakEvent())
  // A top-down view keeps the whole table legible on narrow phones; camera
  // changes are explicit instead of snapping into a close-up after placing.
  game.view.camera.forceMode(game.view.camera.topView)
  game.animate(performance.now())
  for (const [id, direction] of [['aimLeft', -1], ['aimRight', 1]] as const) {
    document.getElementById(id)!.addEventListener('click', () => {
      if (game.paused || game.table.cue.aimInputs.isDisabled()) return
      game.inputQueue.push(new Input(direction * 8, 'movementXUp'))
      viewport.focus({preventScroll:true})
    })
  }
  stateTimer = setInterval(() => {
    const controller = game.controller.name
    if (controller !== lastController) {
      lastController = controller
      updateCopy()
      post('state', {phase:controller})
    }
  }, 250)
  updateCopy()
  started = true
  post('ready')
  pause()
  // Read-only diagnostic state is useful for exercising the real physics path
  // in browser QA; it never accepts commands from the parent.
  Object.defineProperty(window, 'xmBilliardsState', {get: () => ({phase:game.controller.name, mode:bot?'bot':'practice', paused:game.paused, balls:game.table.balls.map(ball => ({x:ball.pos.x,y:ball.pos.y,onTable:ball.onTable()})),theme:document.documentElement.dataset.theme})})
} catch (error) {
  console.error('[billiards] startup failed', error)
  viewport.textContent = 'WebGL could not start. Please reload or try another browser.'
  post('error')
}
window.addEventListener('pagehide', event => {
  if (event.persisted) game?.setPaused(true)
  else { clearInterval(stateTimer); game?.dispose() }
})
window.addEventListener('pageshow', event => {
  if (event.persisted) { pause(); post('ready') }
})
