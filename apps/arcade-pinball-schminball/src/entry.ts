import { Canvas } from 'zcanvas';
import { connectArcadeHost, DEFAULT_ARCADE_CONTEXT } from '../../../packages/arcade-bridge/src/index';
import { FRAME_RATE, BALLS_PER_GAME, ActorTypes, type GameDef } from '../upstream/definitions/game';
import Tables from '../upstream/definitions/tables';
import { init, update, scaleCanvas, setPaused, setFlipperState, bumpTable, snapshot, dispose } from '../upstream/model/game';
import { tickTimers, schedule, timerNow } from '../upstream/services/timers';
import { unlockAudio, pauseAudio, setSound, disposeAudio } from '../upstream/services/audio-service';
import { refreshSprites, tableArt } from './art';
import { label } from './locale';
let context=DEFAULT_ARCADE_CONTEXT;
let game:GameDef={id:'xm',active:false,paused:true,table:0,score:0,balls:BALLS_PER_GAME,multiplier:1,underworld:false};
let hostPaused=false,userPaused=true,booting=true,initialized=false,sound=true,showIntro=true;
let messageUntil=0,messageKey='',lastTable=0,artKey='';
let artQueue: Promise<void> = Promise.resolve();
const pointers=new Map<number,ActorTypes>();
const keys=new Set<string>();
const menu=document.getElementById('menu')!;
const container=document.getElementById('canvas')!;
const select=document.getElementById('table') as HTMLSelectElement;
const start=document.getElementById('start') as HTMLButtonElement;
const restart=document.getElementById('restart') as HTMLButtonElement;
const message=document.getElementById('message')!;
const canvas=new Canvas({width:400,height:600,animate:true,fps:FRAME_RATE,autoSize:false,backgroundColor:'#10151e',onUpdate:(_timestamp,frames)=>{if(!initialized||hostPaused||userPaused)return;const delta=Math.min(frames*1000/60,1000/30);tickTimers(delta);update(timerNow(),Math.min(frames,2));renderHud();if(messageUntil<timerNow())message.classList.remove('visible');}});
canvas.insertInPage(container);canvas.pause(true);
function t(key:string){return label(context.locale,key);}
function flash(key:string,duration=2400){messageKey=key;message.textContent=t(key)+(key==='multiplier'?' '+game.multiplier+'×':'');message.classList.add('visible');messageUntil=timerNow()+duration;}
const messageNames=['multiplier','multiball','loop','group','trick','underworld','escape','lucky','retry','tilt'];
function renderHud(){document.getElementById('score')!.textContent=game.score.toLocaleString();document.getElementById('balls')!.textContent=String(game.balls);document.getElementById('multiplier')!.textContent=game.multiplier+'×';}
function translate(){document.querySelectorAll<HTMLElement>('[data-label]').forEach(el=>el.textContent=t(el.dataset.label!));start.textContent=t(showIntro?'start':game.active?'resume':'start');document.getElementById('menu-status')!.textContent=t(showIntro?'ready':game.active?'paused':'over');if(messageKey)message.textContent=t(messageKey)+(messageKey==='multiplier'?' '+game.multiplier+'×':'');}
function release(){pointers.clear();keys.clear();setFlipperState(ActorTypes.LEFT_FLIPPER,false);setFlipperState(ActorTypes.RIGHT_FLIPPER,false);document.querySelectorAll('.held').forEach(el=>el.classList.remove('held'));}
function syncPause(){const paused=hostPaused||userPaused||booting;game.paused=paused;setPaused(paused);pauseAudio(paused);if(paused)release();}
function fit(){if(!initialized)return;const field=document.getElementById('playfield')!;const width=Math.min(field.clientWidth,600);container.style.width=width+'px';scaleCanvas(width,field.clientHeight);}
function currentArtKey(){return JSON.stringify([game.table,context.theme,context.palette]);}
function updateArt(force=false){
  // zCanvas's worker tracks pending loads by resource id. Two overlapping
  // loads of 'ball' or 'background' overwrite its resolver and never settle.
  const job=artQueue.then(async()=>{
    const key=currentArtKey();
    if(key===artKey&&!force)return;
    const index=game.table;
    const palette=context.palette;
    await refreshSprites(canvas,palette);
    // Transfer a bitmap via the local canvas path. A data-URL string makes
    // zCanvas's Worker fetch it, which the game's connect-src policy forbids.
    const background=tableArt(index,palette);
    Tables[index].background=background;
    if(initialized){await canvas.loadResource('background',background);canvas.invalidate();}
    artKey=key;
  });
  artQueue=job.catch(()=>{});
  return job;
}
const bridge=connectArcadeHost({gameId:'pinball-schminball',onContext(next){context=next;translate();if(!booting)void updateArt().catch(console.error);},onPause(value){hostPaused=value;syncPause();},getState:()=>({screen:showIntro?'intro':userPaused?'paused':game.active?'playing':'over',table:game.table,score:game.score,remainingBalls:game.balls,multiplier:game.multiplier,playerPaused:userPaused,simulationTime:Math.round(timerNow()),...snapshot()})});
async function newGame(index:number){booting=true;start.disabled=true;restart.disabled=true;select.disabled=true;syncPause();await artQueue;initialized=false;game={id:'xm-'+Date.now(),active:false,paused:true,table:index,score:0,balls:BALLS_PER_GAME,multiplier:1,underworld:false};lastTable=index;select.value=String(index);await updateArt(true);await init(canvas,game,(next,timeout)=>{flash(game.balls<=1?'over':'next',timeout);schedule(()=>{next();renderHud();if(!game.active){userPaused=true;showIntro=false;menu.hidden=false;translate();syncPause();}},timeout);},(id,timeout)=>flash(messageNames[id]??'group',timeout));initialized=true;
// Context messages received during init are retained above, then painted only
// after init's own background load has completed. Catch up to the latest theme.
while(artKey!==currentArtKey())await updateArt();
booting=false;fit();syncPause();renderHud();translate();start.disabled=false;restart.disabled=false;select.disabled=false;bridge.ready();}
function resume(){showIntro=false;userPaused=false;menu.hidden=true;unlockAudio();syncPause();}
start.onclick=async()=>{if(booting)return;unlockAudio();if(!game.active||Number(select.value)!==game.table){await newGame(Number(select.value));}resume();};
restart.onclick=async()=>{if(booting)return;unlockAudio();await newGame(Number(select.value));resume();};
document.getElementById('pause')!.onclick=()=>{if(booting)return;userPaused=true;showIntro=false;menu.hidden=false;translate();syncPause();};
select.onchange=()=>{if(!booting)void newGame(Number(select.value));};
document.getElementById('sound')!.onclick=()=>{sound=!sound;document.getElementById('sound')!.setAttribute('aria-pressed',String(sound));setSound(sound);};
function updateFlippers(){const left=[...pointers.values()].includes(ActorTypes.LEFT_FLIPPER)||keys.has('ArrowLeft')||keys.has('a');const right=[...pointers.values()].includes(ActorTypes.RIGHT_FLIPPER)||keys.has('ArrowRight')||keys.has('d');setFlipperState(ActorTypes.LEFT_FLIPPER,left);setFlipperState(ActorTypes.RIGHT_FLIPPER,right);document.getElementById('left')!.classList.toggle('held',left);document.getElementById('right')!.classList.toggle('held',right);}
function press(event:PointerEvent,flipper?:ActorTypes){if(hostPaused||userPaused||booting||!game.active)return;event.preventDefault();unlockAudio();const target=event.currentTarget as HTMLElement;try{target.setPointerCapture(event.pointerId);}catch{/* Synthetic or already-ended pointer. */}const rect=container.getBoundingClientRect();const type=flipper??(event.clientX-rect.left<rect.width/2?ActorTypes.LEFT_FLIPPER:ActorTypes.RIGHT_FLIPPER);pointers.set(event.pointerId,type);updateFlippers();}
container.addEventListener('pointerdown',event=>press(event));
document.getElementById('left')!.addEventListener('pointerdown',event=>press(event,ActorTypes.LEFT_FLIPPER));
document.getElementById('right')!.addEventListener('pointerdown',event=>press(event,ActorTypes.RIGHT_FLIPPER));
for(const name of ['pointerup','pointercancel','lostpointercapture'])window.addEventListener(name,event=>{pointers.delete((event as PointerEvent).pointerId);updateFlippers();});
let lastNudge=0;function nudge(){const now=performance.now();if(!hostPaused&&!userPaused&&!booting&&now-lastNudge>150){lastNudge=now;unlockAudio();bumpTable(game);}}
document.getElementById('nudge')!.addEventListener('pointerdown',event=>{event.preventDefault();nudge();});
window.addEventListener('keydown',event=>{if(event.target instanceof HTMLSelectElement)return;if(['ArrowLeft','ArrowRight','a','d',' ','ArrowUp','Escape'].includes(event.key)){event.preventDefault();if(event.key==='Escape'){if(!userPaused){userPaused=true;showIntro=false;menu.hidden=false;translate();syncPause();}else if(game.active)resume();return;}if(hostPaused||userPaused||booting)return;if(event.key===' '||event.key==='ArrowUp'){if(!event.repeat)nudge();}else{keys.add(event.key);unlockAudio();updateFlippers();}}});
window.addEventListener('keyup',event=>{keys.delete(event.key);updateFlippers();});window.addEventListener('blur',release);
new ResizeObserver(fit).observe(document.getElementById('playfield')!);window.visualViewport?.addEventListener('resize',fit);
window.addEventListener('pagehide',(event)=>{release();if(event.persisted)return;dispose();canvas.dispose();disposeAudio();bridge.dispose();});
newGame(lastTable).catch(error=>{console.error(error);bridge.fail('Pinball could not start');});
