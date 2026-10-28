import 'pixi.js/unsafe-eval';
import { createRenderer, setDeckCollapsed } from '../upstream/render/pixiApp.ts';
import { createTextures } from '../upstream/render/textures.ts';
import { buildMapLayer } from '../upstream/render/mapLayer.ts';
import { WorldView } from '../upstream/render/worldView.ts';
import { Overlay } from '../upstream/render/overlay.ts';
import { Effects } from '../upstream/render/effects.ts';
import { TowerChrome } from '../upstream/render/towerChrome.ts';
import { CreepChrome } from '../upstream/render/creepChrome.ts';
import { tilesToPx } from '../upstream/render/constants.ts';
import { applyHudTheme, fieldFor, DEFAULT_FIELD } from '../upstream/render/theme.ts';
import { AudioEngine } from '../upstream/audio/engine.ts';
import { Soundscape } from '../upstream/audio/soundscape.ts';

import { LEVEL01 } from '../upstream/content/maps/level01.ts';
import { CAMPAIGN, type LevelDef } from '../upstream/content/levels.ts';
import { DIFFICULTIES, DEFAULT_DIFFICULTY, type DifficultyId } from '../upstream/content/difficulty.ts';
import { parseMap } from '../upstream/sim/util/grid.ts';
import { hashSeed } from '../upstream/sim/util/rng.ts';
import { DEFAULT_RULES, resolveRules, type Rules } from '../upstream/sim/rules.ts';
import { createWorld, type World } from '../upstream/sim/world.ts';
import type { SimEvent } from '../upstream/sim/types.ts';
import { grade } from '../upstream/sim/analysis.ts';
import { recordRun } from '../upstream/app/progress.ts';
import { trackKeyboardInset } from '../upstream/ui/viewport.ts';
import { createLoop } from '../upstream/app/loop.ts';
import { attachInput } from '../upstream/app/input.ts';
import { createUiState } from '../upstream/app/uiState.ts';
import { createHud, type CampaignPorts } from '../upstream/ui/hud.ts';

import { connectArcadeHost, DEFAULT_ARCADE_CONTEXT, type ArcadeContext } from '../../../packages/arcade-bridge/src/index';
import { loadProgress, isUnlocked, rememberLaunch } from '../upstream/app/progress';
import { installTranslations, translateHud, tr } from './locale';
let context = DEFAULT_ARCADE_CONTEXT;
let hostPaused = false;
let runtime: Awaited<ReturnType<typeof startGame>> | undefined;
const screens=document.getElementById('screens')!;
applyHudTheme();
trackKeyboardInset();
installTranslations(() => context.locale);
const bridge=connectArcadeHost({gameId:'deep-field',onContext(next){context=next; applyColors(); runtime?.applyPalette(next); translateHud(); if(!runtime&&!CAMPAIGN.some(level=>level.id===new URLSearchParams(location.search).get('level'))) renderMenu();},onPause(paused){hostPaused=paused; window.dispatchEvent(new Event('blur')); if(runtime){ if(paused){runtime.loop.stop(); void runtime.audio.context?.suspend();}else{runtime.loop.start(); if(!runtime.ui.paused) void runtime.audio.context?.resume();}}},getState:()=>runtime?{screen:'campaign',sector:runtime.world.map.name,phase:runtime.world.phase,money:runtime.world.money,lives:runtime.world.lives,wave:runtime.world.wave.index+1,towers:runtime.world.towers.length,stations:runtime.world.towers.map(t=>({id:t.id,type:t.defId,col:t.col,row:t.row,tiers:{...t.tiers}})),creeps:runtime.world.creeps.length,simulationTime:runtime.world.time,playerPaused:runtime.ui.paused}: {screen:'sectors',sectors:CAMPAIGN.length}});
function applyColors(){const p=context.palette; const css=document.documentElement.style; for(const [key,value] of Object.entries({bg:p.canvas,text:p.ink,dim:p.muted,panel:p.surface,'panel-edge':p.border,accent:p.accent,'accent-soft':p.accent,danger:p.danger}))css.setProperty('--'+key,'#'+value.toString(16).padStart(6,'0'));}
function renderMenu(){const p=loadProgress(); const locale=context.locale; screens.innerHTML=`<main class="xm-menu"><header><span>XM / DEEP FIELD</span><h1>${tr(locale,'Deep Field')}</h1><p>${tr(locale,'Build stations, defend the route, clear all eight sectors.')}</p></header><label class="difficulty">${tr(locale,'Difficulty')}<select id="difficulty"><option value="recon">${tr(locale,'Recon')}</option><option value="standard" selected>${tr(locale,'Standard')}</option><option value="blackout">${tr(locale,'Blackout')}</option></select></label><div class="sector-grid">${CAMPAIGN.map((l,i)=>{const open=isUnlocked(p,i);return `<button class="sector" data-sector="${i}" ${open?'':'disabled'}><small>${tr(locale,'Sector')} ${String(i+1).padStart(2,'0')} ${p.levels[l.id]?.cleared?'✓':open?'':'🔒'}</small><strong>${tr(locale,l.name)}</strong><span>${l.waves.length} ${tr(locale,'waves')}</span></button>`}).join('')}</div><p class="xm-instructions">${tr(locale,'Choose a station, then tap a free tile. Hold and release to build on touch screens. Tap a built station to upgrade it.')}</p></main>`; screens.querySelectorAll<HTMLButtonElement>('[data-sector]').forEach(b=>b.onclick=()=>{const level=CAMPAIGN[Number(b.dataset.sector)];const difficulty=(screens.querySelector('select') as HTMLSelectElement).value as DifficultyId; rememberLaunch(difficulty,''); location.search=runQuery(level,difficulty,'');});}
function resolveSeed(){const raw=new URLSearchParams(location.search).get('seed');return raw?hashSeed(raw):Math.floor(Math.random()*0xffffffff)>>>0;}
function runQuery(level:LevelDef,difficulty:DifficultyId,seed:string,bank?:number){const p=new URLSearchParams({level:level.id,difficulty});if(seed)p.set('seed',seed);if(bank!==undefined)p.set('bank',String(bank));return '?'+p;}
const HUD_INTERVAL_MS=100;
async function boot(){const params=new URLSearchParams(location.search);const level=CAMPAIGN.find(l=>l.id===params.get('level')); if(!level){renderMenu();bridge.ready();return;}const raw=params.get('difficulty')??''; const difficulty:DifficultyId=Object.hasOwn(DIFFICULTIES,raw)?raw as DifficultyId:DEFAULT_DIFFICULTY;const bankValue=params.get('bank');const bank=bankValue!==null&&Number.isFinite(Number(bankValue))&&Number(bankValue)>=0?Math.floor(Number(bankValue)):undefined;screens.innerHTML='';const index=CAMPAIGN.indexOf(level);const nextLevel=CAMPAIGN[index+1];let finalMoney=0;runtime=await startGame(document.getElementById('game-root')!,document.getElementById('hud')!,resolveSeed(),{level,rules:resolveRules(level,difficulty,bank),campaign:{nextName:nextLevel?.name??null,menu:()=>location.search='',next:()=>{if(nextLevel)location.search=runQuery(nextLevel,difficulty,'',finalMoney)}},onEnd(w){finalMoney=Math.floor(w.money);recordRun(level.id,difficulty,{grade:grade(w),lives:w.lives,startingLives:w.rules.startingLives,seconds:w.time,waves:w.wave.clearedThrough+1},w.phase==='won');}});runtime.applyPalette(context);applyColors();translateHud(); if(hostPaused){runtime.loop.stop(); void runtime.audio.context?.suspend();}bridge.ready();}
boot().catch(err=>{console.error(err);bridge.fail('Deep Field could not start');});
window.addEventListener('pagehide',(event)=>{window.dispatchEvent(new Event('blur'));if(event.persisted)return;runtime?.loop.stop();void runtime?.audio.context?.close();bridge.dispose();});
interface StartOptions {
  level?: LevelDef;
  rules?: Rules;
  campaign?: CampaignPorts;
  /**
   * Where a launched sortie goes, and where a landing is reported.
   *
   * Absent means the local loopback — you play both sides, which is how the
   * economy gets tuned. A real match supplies the relay instead. Neither the
   * sim nor this function knows which it got, and that is the point.
   */
  sortieRelay?: (ev: SimEvent) => void;
  /** Fired once, the first frame the run is no longer playing. */
  onEnd?: (w: World) => void;
}

async function startGame(
  mount: HTMLElement,
  hudRoot: HTMLElement,
  seed: number,
  opts: StartOptions = {},
) {
  // Race mode passes neither, and gets the baseline game it has always played.
  const map = parseMap(opts.level?.map ?? LEVEL01);
  const rules = opts.rules ?? DEFAULT_RULES;
  const world = createWorld(map, seed, rules);
  const ui = createUiState();
  ui.deckOpen = true;

  // A real match passes the relay; solo versus falls back to playing both
  // sides. Everything else is blind to which of the two it got.
  const sortieRelay = opts.sortieRelay ?? (rules.sorties ? (() => {}) : null);

  const boardW = tilesToPx(map.cols);
  const boardH = tilesToPx(map.rows);

  // Race passes no level, so it plays the baseline ground — the same one on both
  // clients, which is what keeps two screens comparable at a glance.
  const field = { ...fieldFor(opts.level?.field) };
  // The same flag `renderDeck` wraps on, so the height reserved and the rows
  // actually laid out cannot disagree — a deck that wrapped without being paid
  // for would put its second row back over the final approach.
  const { app, layers } = await createRenderer(mount, boardW, boardH, field, rules.sorties);

  const textures = createTextures(app.renderer);
  let mapLayer = buildMapLayer(map, textures, field);
  layers.map.addChild(mapLayer.view);

  const view = new WorldView(layers, textures);
  const overlay = new Overlay(layers, textures);
  const effects = new Effects(layers, boardW, boardH);
  const audio = new AudioEngine();
  // The id, not the resolved `field` — the bed is keyed by which sector this is,
  // and `SectorField` is a palette of colours with no identity of its own.
  const soundscape = new Soundscape(audio, opts.level?.field ?? DEFAULT_FIELD);
  const towerChrome = new TowerChrome(layers, field);
  const creepChrome = new CreepChrome(layers, textures);

  function togglePause(): void {
    ui.paused = !ui.paused;
    loop.paused = ui.paused;
    if (ui.paused) void audio.context?.suspend(); else if (!hostPaused) void audio.context?.resume();
  }

  const hud = createHud(hudRoot, {
    world,
    ui,
    dispatch: (cmd) => world.commands.push(cmd),
    speed: {
      get: () => loop.speed,
      set: (v) => {
        loop.speed = v;
      },
    },
    togglePause,
    // Collapsing the deck frees the room the docks reserved, so the board
    // refits into it. See `setDeckCollapsed` for why this is an event.
    deckToggled: () => {
      setDeckCollapsed(!ui.deckOpen);
    },
    audio: {
      apply: (prefs) => {
        audio.setVolume(prefs.volume);
        audio.setMuted(prefs.muted);
      },
    },
    // A full reload is the honest restart: it re-runs seed resolution, rebuilds
    // the world and resets every renderer pool, with no chance of a stale
    // reference surviving into the new run. Cheap, and impossible to get wrong.
    restart: () => {
      location.reload();
    },
    ...(opts.campaign === undefined ? {} : { campaign: opts.campaign }),
  });

  setDeckCollapsed(!ui.deckOpen);

  // main.ts is the only place that knows about both halves. The sim has no
  // reference to the view; the view only ever reads the world.
  let hudDue = 0;
  let lastRenderMs = performance.now();
  let ended = false;

  const loop = createLoop(world, () => {
    const now = performance.now();
    // Wall-clock delta, clamped: effects decay at the same rate at 1x and 4x,
    // and a backgrounded tab must not fast-forward them on return.
    const dt = Math.min(0.1, (now - lastRenderMs) / 1000);
    lastRenderMs = now;

    // One drain, three consumers. Whichever ran first would otherwise starve
    // the others, which is exactly the bug that made the HUD miss wave clears.
    effects.beginFrame();
    soundscape.beginFrame();
    for (const ev of world.events) {
      if(ev.type==='towerPlaced'&&matchMedia('(pointer:coarse)').matches){ui.selected=null;ui.inspecting=ev.id;ui.touchPreview=null;}
      creepChrome.onEvent(ev);
      effects.onEvent(ev, ui.prefs);
      soundscape.onEvent(ev);
      hud.onEvent(ev);
      sortieRelay?.(ev);
    }
    world.events.length = 0;

    // Real seconds, not `dt` scaled by the speed multiplier: the current is a
    // property of the road, not of how fast the game is being run.
    if (ui.prefs.stream) mapLayer.step(1 / 60);

    view.sync(world);
    // Before the overlay reads it: if the player disarmed by any route, the
    // parked touch preview has nothing left to describe.
    input.reconcile();
    overlay.sync(world, ui.selected, ui.hover, ui.inspecting, ui.touchPreview);
    effects.update(world, dt);
    soundscape.update(world, ui.selected, dt);
    creepChrome.sync(world, dt);
    towerChrome.sync(world, ui.prefs);

    if (now >= hudDue) {
      hud.update();
      hudDue = now + HUD_INTERVAL_MS;
    }

    // Once, on the frame the run settles. Reading it here rather than polling
    // means the record is written from the same world state the victory card is
    // about to describe, so the two can never disagree.
    if (!ended && world.phase !== 'playing') {
      ended = true;
      opts.onEnd?.(world);
    }

    app.render();
  });

  const input = attachInput(app, world, ui, togglePause, hudRoot);

  // Any gesture voids the 10Hz throttle: a hotkey arming a station or a click
  // opening the inspector shows on the next frame, not up to 100ms later. The
  // HUD's own buttons update synchronously in hud.ts; this covers the rest.
  //
  // It is also where the mixer comes to life. A browser refuses to start an
  // AudioContext outside a user gesture, so the game is genuinely silent until
  // the first click or keypress — correct behaviour, not a bug to route around.
  // `unlock` returns immediately once the graph exists, so this stays cheap.
  const wake = (): void => {
    hudDue = 0;
    if (hostPaused || ui.paused) return;
    audio.unlock();
    audio.setVolume(ui.prefs.volume);
    audio.setMuted(ui.prefs.muted);
  };
  window.addEventListener('keydown', wake);
  window.addEventListener('pointerdown', wake);

  if (!hostPaused) loop.start();

  app.render();
  let paletteKey='';
  return { world, loop, ui, audio, app, applyPalette(context: ArcadeContext) {
    const key=JSON.stringify(context.palette);if(key===paletteKey)return;paletteKey=key;
    const c = (v: number) => v;
    const p = context.palette;
    const mix=(a:number,b:number,t:number)=>{const channel=(shift:number)=>Math.round(((a>>shift)&255)*(1-t)+((b>>shift)&255)*t);return (channel(16)<<16)|(channel(8)<<8)|channel(0);};
    Object.assign(field, {bg:c(p.canvas),ground:c(p.canvas),groundAlt:mix(p.canvas,p.ink,.035),groundAlpha:1,gridLine:mix(p.canvas,p.ink,.25),gridAlpha:.42,blocked:mix(p.canvas,p.ink,.3),blockedEdge:p.ink,path:mix(p.canvas,p.accent,.32),pathLit:mix(p.canvas,p.accent,.5),pathEdge:p.accent,lineNear:p.accent,lineFar:p.accent,lineNearAlpha:.7,lineFarAlpha:1,goal:p.accent,spawn:p.accent,star:p.border,starBright:p.ink});
    const old = mapLayer.view;
    layers.map.removeChild(old);
    mapLayer = buildMapLayer(map, textures, field);
    layers.map.addChild(mapLayer.view);
    old.destroy({children:true});
    app.renderer.background.color = p.canvas;
    app.render();
  }};
}
