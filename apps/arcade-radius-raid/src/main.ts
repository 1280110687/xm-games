import './globals.js'
import '../upstream/js/util.js'
import '../upstream/js/ease.js'
import './storage.js'
import '../upstream/js/definitions.js'
import './synth.js'
import '../upstream/js/text.js'
import '../upstream/js/hero.js'
import '../upstream/js/enemy.js'
import '../upstream/js/bullet.js'
import '../upstream/js/explosion.js'
import '../upstream/js/powerup.js'
import '../upstream/js/particle.js'
import '../upstream/js/particleemitter.js'
import '../upstream/js/textpop.js'
import '../upstream/js/levelpop.js'
import '../upstream/js/button.js'
import '../upstream/js/game.js'
import { connectArcadeHost, DEFAULT_ARCADE_CONTEXT, type ArcadeContext } from '../../../packages/arcade-bridge/src/index'

// The original Canvas engine intentionally exposes one shared game namespace.
interface RadiusEnemy { life:number; x:number; y:number }
interface RadiusHero extends RadiusEnemy { fillStyle:string; weapon:{bullet:{color:{value:string}}} }
interface SpawnEntry { lastSpawn:number }
interface RadiusEngine {
  state:string; score:number; mute:boolean; cw:number; ch:number; ww:number; wh:number; gameScale:number; cratio:number; lt:number; pt:number|null
  kills:number; bulletsFired:number; hero:RadiusHero; enemies:RadiusEnemy[]; bullets:unknown[]
  keys:{state:Record<string,number>;pressed:Record<string,number>}; okeys:Record<string,number>
  definitions:{enemies:unknown[];powerups:unknown[];levels:{distribution:SpawnEntry[]}[]}
  level:{current:number;distribution:SpawnEntry[]}; storage:Record<string,number>
  screen:{x:number;y:number}; mouse:{x:number;y:number;ax:number;ay:number;down:number}; cOffset:{left:number;top:number}
  minimap:{width:number;height:number;scale:number;x:number;y:number;color:string;strokeColor:string}
  wrap:HTMLElement; cmg:HTMLCanvasElement; cbg1:HTMLCanvasElement; cbg2:HTMLCanvasElement; cbg3:HTMLCanvasElement; cbg4:HTMLCanvasElement
  states:Record<string,()=>void>
  init():void; reset():void; setState(state:string):void; resizecb():void; bindEvents():void; loop():void; renderInterface():void
  renderBackground1():void; renderBackground2():void; renderBackground3():void; renderBackground4():void
  updateScreen():void; mousescreen():void; updateStorage():void; unlockAudio():void; pauseAudio(paused:boolean):void; closeAudio():void
}
declare const $: RadiusEngine
declare const Howler: {mute(value:boolean):void}
const COPY={
  zh:{title:'半径突袭',description:'移动躲避敌群，收集五种强化。左侧摇杆移动，自动瞄准最近敌人；电脑使用 WASD 或方向键移动，鼠标瞄准并按住开火。',start:'开始游戏',again:'再来一局',resume:'继续游戏',paused:'已暂停',over:'本次突袭结束',score:'得分',level:'关卡',auto:'自动瞄准',fire:'开火',pause:'暂停',sound:'切换声音',move:'移动摇杆',health:'生命'},
  en:{title:'Radius Raid',description:'Dodge enemy swarms and collect five power-ups. Move with the left stick and auto-aim at nearby enemies. On desktop use WASD or arrows; aim and hold the mouse to fire.',start:'Start game',again:'Play again',resume:'Resume',paused:'Paused',over:'Raid ended',score:'Score',level:'Level',auto:'Auto aim',fire:'Fire',pause:'Pause',sound:'Toggle sound',move:'Movement stick',health:'Health'},
  th:{title:'เรเดียส เรด',description:'หลบฝูงศัตรูและเก็บพลังเสริม 5 แบบ ใช้จอยซ้ายเคลื่อนที่และเล็งอัตโนมัติ บนคอมพิวเตอร์ใช้ WASD หรือลูกศรและกดเมาส์ค้างเพื่อยิง',start:'เริ่มเกม',again:'เล่นอีกครั้ง',resume:'เล่นต่อ',paused:'หยุดชั่วคราว',over:'จบการจู่โจม',score:'คะแนน',level:'ด่าน',auto:'เล็งอัตโนมัติ',fire:'ยิง',pause:'หยุด',sound:'เปิดปิดเสียง',move:'จอยเคลื่อนที่',health:'พลังชีวิต'},
} as const
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T
const overlay=el('overlay'),start=el('start'),stick=el('stick'),knob=el('stick-knob'),field=el<HTMLCanvasElement>('cmg')
const controller=new AbortController(),signal=controller.signal,keyboard=new Set<string>()
let context:ArcadeContext=DEFAULT_ARCADE_CONTEXT,hostPaused=false,hostPauseAt=0,initialized=false,disposed=false,raf=0
let autoAim=matchMedia('(pointer:coarse)').matches||Math.min(innerWidth,innerHeight)<600,autoAimTouched=false,fireHeld=false,canvasPointer:number|null=null,stickPointer:number|null=null,stickX=0,stickY=0
const css=(color:number)=>`#${color.toString(16).padStart(6,'0')}`
const word=(key:keyof typeof COPY.en)=>COPY[context.locale][key]
function copy(){
  document.documentElement.lang=context.locale
  el('title').textContent=$.state==='pause'?word('paused'):$.state==='gameover'?word('over'):word('title')
  el('description').textContent=$.state==='gameover'?`${word('score')} ${$.score}`:word('description')
  start.textContent=$.state==='pause'?word('resume'):$.state==='gameover'?word('again'):word('start')
  for(const id of ['fire','auto'] as const)el(id).textContent=word(id)
  el('auto').setAttribute('aria-pressed',String(autoAim))
  for(const id of ['sound','pause'] as const)el(id).setAttribute('aria-label',word(id))
  el('sound').setAttribute('aria-pressed',String(!$.mute))
  el('stick').setAttribute('aria-label',word('move'));field.setAttribute('aria-label',word('title'))
  el('health').setAttribute('aria-label',word('health'))
  if($.hero){$.hero.fillStyle=css(context.palette.ink);$.hero.weapon.bullet.color.value=css(context.palette.accent)}
  if($.minimap){$.minimap.color=css(context.palette.surface);$.minimap.strokeColor=css(context.palette.border)}
  updateHud()
}
function updateHud(){
  el('score').textContent=String($.score??0);el('score').setAttribute('aria-label',`${word('score')} ${$.score??0}`)
  el('level').textContent=`${word('level')} ${($.level?.current??0)+1}`
  el('health').firstElementChild!.setAttribute('style',`width:${Math.max(0,Math.min(1,$.hero?.life??1))*100}%`)
}
function syncMovement(){
  if(!$.keys)return
  for(const [action,codes,axis] of [['left',['ArrowLeft','KeyA'],stickX<-.18],['right',['ArrowRight','KeyD'],stickX>.18],['up',['ArrowUp','KeyW'],stickY<-.18],['down',['ArrowDown','KeyS'],stickY>.18]] as const)
    $.keys.state[action]=axis||codes.some(code=>keyboard.has(code))?1:0
}
function clearInput(){
  keyboard.clear();stickPointer=null;canvasPointer=null;fireHeld=false;stickX=stickY=0;knob.style.transform=''
  if($.keys){for(const key in $.keys.state)$.keys.state[key]=0;$.okeys={}}
  if($.mouse)$.mouse.down=0
}
function cancelFrame(){if(raf)cancelAnimationFrame(raf);raf=0}
function schedule(){if(!disposed&&!hostPaused&&$.state==='play'&&!raf)raf=requestAnimationFrame(frame)}
function frame(){
  raf=0;if(disposed||hostPaused||$.state!=='play')return
  syncMovement()
  for(const key in $.keys.state)$.keys.pressed[key]=$.keys.state[key]&&!$.okeys[key]?1:0
  if(autoAim&&$.hero?.life>0){
    let nearest:RadiusEnemy|null=null,distance=Infinity
    for(const enemy of $.enemies){if(enemy.life<=0)continue;const d=(enemy.x-$.hero.x)**2+(enemy.y-$.hero.y)**2;if(d<distance){distance=d;nearest=enemy}}
    if(nearest){$.mouse.ax=(nearest.x+$.screen.x)*$.gameScale+$.cOffset.left;$.mouse.ay=(nearest.y+$.screen.y)*$.gameScale+$.cOffset.top}
    $.mouse.down=nearest||fireHeld?1:0
  }else $.mouse.down=fireHeld||canvasPointer!==null?1:0
  $.states.play()
  $.okeys={...$.keys.state};schedule()
}
function resize(){
  if(!$.cmg)return
  // Resizing a canvas clears it. Keep the frozen scene visible without running physics.
  const frozenFrame=initialized&&(hostPaused||$.state!=='play')?document.createElement('canvas'):null
  if(frozenFrame){frozenFrame.width=$.cmg.width;frozenFrame.height=$.cmg.height;frozenFrame.getContext('2d')!.drawImage($.cmg,0,0)}
  const mobile=Math.min(innerWidth,innerHeight)<600
  if(!autoAimTouched)autoAim=matchMedia('(pointer:coarse)').matches||mobile
  const scale=Math.max(innerWidth/1400,innerHeight/1000,Math.min(innerWidth/(mobile?480:800),innerHeight/(mobile?360:600)))
  $.cw=Math.round(innerWidth/scale);$.ch=Math.round(innerHeight/scale);$.gameScale=scale;$.cratio=$.cw/$.ch
  $.cmg.width=$.cw;$.cmg.height=$.ch
  $.wrap.style.width=`${$.cw}px`;$.wrap.style.height=`${$.ch}px`;$.wrap.style.transform=`translate(-50%,-50%) scale(${scale})`
  el('wrap-inner').style.width=`${$.cw}px`;el('wrap-inner').style.height=`${$.ch}px`
  for(const [i,bg] of [$.cbg1,$.cbg2,$.cbg3,$.cbg4].entries()){const ratio=1.1+i*.05;bg.width=Math.floor($.cw*ratio);bg.height=Math.floor($.ch*ratio)}
  const rect=$.cmg.getBoundingClientRect();$.cOffset={left:rect.left,top:rect.top}
  if($.minimap){$.minimap.width=80;$.minimap.height=60;$.minimap.scale=80/$.ww;$.minimap.x=14/scale;$.minimap.y=66/scale}
  if(initialized){$.renderBackground1();$.renderBackground2();$.renderBackground3();$.renderBackground4();if($.hero)$.updateScreen();copy()}
  if(frozenFrame)$.cmg.getContext('2d')!.drawImage(frozenFrame,0,0,$.cw,$.ch)
}
$.resizecb=resize
$.renderInterface=updateHud
$.bindEvents=()=>{}
// Only the play state runs frames; localized HTML owns menus and pause screens.
$.loop=schedule
const originalSetState=$.setState
$.setState=(state:string)=>{
  originalSetState(state);clearInput();overlay.hidden=state==='play';copy()
  $.pauseAudio(state!=='play'||hostPaused)
  if(state==='play'){ $.pt=null;schedule() }else cancelFrame()
}
function togglePause(){if(hostPaused)return;if($.state==='play')$.setState('pause');else if($.state==='pause')$.setState('play')}
const bridge=connectArcadeHost({gameId:'radius-raid',onContext(next){context=next;copy()},onPause(value){
  if(value===hostPaused)return
  hostPaused=value;clearInput();$.pauseAudio(value||$.state!=='play')
  if(value){hostPauseAt=Date.now();cancelFrame()}else{
    if($.state==='play'&&hostPauseAt){const delta=Date.now()-hostPauseAt;for(const entry of $.level.distribution)entry.lastSpawn+=delta;$.lt=Date.now()}
    hostPauseAt=0;schedule()
  }
},getState(){return{phase:hostPaused||$.state==='pause'?'paused':$.state==='play'?'playing':$.state==='gameover'?'game-over':'menu',score:$.score??0,level:($.level?.current??0)+1,health:$.hero?.life??1,hero:$.hero?{x:$.hero.x,y:$.hero.y}:null,enemies:$.enemies?.length??0,bullets:$.bullets?.length??0,kills:$.kills??0,bulletsFired:$.bulletsFired??0,autoAim,viewport:{width:$.cw,height:$.ch},enemyTypes:$.definitions.enemies.length,powerUpTypes:$.definitions.powerups.length}}})
start.addEventListener('click',()=>{
  if(hostPaused)return
  $.unlockAudio()
  if($.state==='pause')$.setState('play');else{$.reset();$.setState('play')}
},{signal})
el('pause').addEventListener('click',togglePause,{signal})
el('sound').addEventListener('click',()=>{$.mute=!$.mute;Howler.mute($.mute);$.storage.mute=$.mute?1:0;$.updateStorage();if(!$.mute)$.unlockAudio();copy()},{signal})
el('auto').addEventListener('click',()=>{autoAimTouched=true;autoAim=!autoAim;$.mouse.down=0;copy()},{signal})
stick.addEventListener('pointerdown',event=>{if(hostPaused||$.state!=='play'||stickPointer!==null)return;event.preventDefault();$.unlockAudio();stickPointer=event.pointerId;stick.setPointerCapture(event.pointerId);moveStick(event)},{signal})
function moveStick(event:PointerEvent){if(event.pointerId!==stickPointer)return;const rect=stick.getBoundingClientRect(),radius=rect.width/2-20;let x=event.clientX-rect.left-rect.width/2,y=event.clientY-rect.top-rect.height/2;const length=Math.hypot(x,y);if(length>radius){x*=radius/length;y*=radius/length}stickX=x/radius;stickY=y/radius;knob.style.transform=`translate(${x}px,${y}px)`;syncMovement()}
stick.addEventListener('pointermove',moveStick,{signal})
const endStick=(event:PointerEvent)=>{if(event.pointerId!==stickPointer)return;stickPointer=null;stickX=stickY=0;knob.style.transform='';syncMovement()}
for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,endStick as EventListener,{signal})
el('fire').addEventListener('pointerdown',event=>{if(hostPaused||$.state!=='play')return;event.preventDefault();$.unlockAudio();el('fire').setPointerCapture(event.pointerId);fireHeld=true},{signal})
for(const type of ['pointerup','pointercancel','lostpointercapture'])el('fire').addEventListener(type,()=>{fireHeld=false},{signal})
const aim=(event:PointerEvent)=>{$.mouse.ax=event.clientX;$.mouse.ay=event.clientY;$.mousescreen()}
field.addEventListener('pointerdown',event=>{if(hostPaused||$.state!=='play')return;event.preventDefault();$.unlockAudio();canvasPointer=event.pointerId;field.setPointerCapture(event.pointerId);aim(event)},{signal})
field.addEventListener('pointermove',event=>{if(event.pointerType==='mouse'||event.pointerId===canvasPointer)aim(event)},{signal})
for(const type of ['pointerup','pointercancel','lostpointercapture'])field.addEventListener(type,()=>{canvasPointer=null;$.mouse.down=0},{signal})
window.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyW','KeyS','KeyP','KeyM','Escape','Enter','Space'].includes(event.code))return
  event.preventDefault();if(event.repeat&&['KeyP','Escape','KeyM','Enter'].includes(event.code))return
  if(event.code==='KeyP'||event.code==='Escape'){togglePause();return}if(event.code==='KeyM'){el('sound').click();return}if(event.code==='Enter'&&$.state!=='play'){start.click();return}
  if(hostPaused||$.state!=='play')return;$.unlockAudio();keyboard.add(event.code);if(event.code==='Space')fireHeld=true;syncMovement()
},{signal})
window.addEventListener('keyup',event=>{keyboard.delete(event.code);if(event.code==='Space')fireHeld=false;syncMovement()},{signal})
window.addEventListener('blur',clearInput,{signal});window.addEventListener('resize',resize,{signal})
field.addEventListener('contextmenu',event=>event.preventDefault(),{signal})
try{$.init();initialized=true;copy();bridge.ready()}catch(error){bridge.fail(error instanceof Error?error.message:'Unable to start Radius Raid');el('description').textContent='Unable to start the game. Please reload.'}
window.addEventListener('pagehide',event=>{if(event.persisted)return;disposed=true;cancelFrame();controller.abort();clearInput();$.closeAudio();bridge.dispose()})
