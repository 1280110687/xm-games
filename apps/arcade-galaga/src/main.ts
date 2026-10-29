import { Application, Container } from 'pixi.js'
import 'pixi.js/unsafe-eval'
import { connectArcadeHost, DEFAULT_ARCADE_CONTEXT, type ArcadeContext } from '../../../packages/arcade-bridge/src/index'
import createGame from '../upstream/galaga'
import { RNG } from '../upstream/rng'
import type { Game, GameContext } from './types'

const COPY={
  zh:{title:'星阵突击',description:'击退敌机编队，收集双机、速射与护盾。左右拖动或按箭头移动，按住射击连续开火。',start:'开始游戏',again:'再来一局',resume:'继续游戏',paused:'已暂停',over:'本次出击结束',score:'得分',wave:'波次',drag:'拖动移动',fire:'射击',streak:'连击',dual:'双机出击',rapid:'速射强化',shield:'护盾已就绪',shieldDown:'护盾已抵挡攻击',pause:'暂停',sound:'切换声音',left:'向左移动',right:'向右移动'},
  en:{title:'Star Squadron',description:'Defeat diving formations. Collect dual fighters, rapid fire and shields. Drag or use arrows to move; hold Fire to keep shooting.',start:'Start game',again:'Play again',resume:'Resume',paused:'Paused',over:'Mission ended',score:'Score',wave:'Wave',drag:'Drag to move',fire:'Fire',streak:'Streak',dual:'Dual fighters',rapid:'Rapid fire',shield:'Shield ready',shieldDown:'Shield absorbed the hit',pause:'Pause',sound:'Toggle sound',left:'Move left',right:'Move right'},
  th:{title:'ฝูงบินพิทักษ์',description:'จัดการฝูงบินศัตรู เก็บพลังยิงคู่ ยิงเร็วและโล่ ลากหรือใช้ลูกศรเพื่อเคลื่อนที่ กดปุ่มยิงค้างเพื่อยิงต่อเนื่อง',start:'เริ่มเกม',again:'เล่นอีกครั้ง',resume:'เล่นต่อ',paused:'หยุดชั่วคราว',over:'จบภารกิจ',score:'คะแนน',wave:'ระลอก',drag:'ลากเพื่อเคลื่อนที่',fire:'ยิง',streak:'ต่อเนื่อง',dual:'ยิงคู่',rapid:'ยิงเร็ว',shield:'โล่พร้อม',shieldDown:'โล่ป้องกันการโจมตีแล้ว',pause:'หยุด',sound:'เปิดปิดเสียง',left:'ไปทางซ้าย',right:'ไปทางขวา'},
} as const
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T
const canvas=el('canvas'),overlay=el('overlay'),start=el<HTMLButtonElement>('start')
start.disabled=true
let context:ArcadeContext=DEFAULT_ARCADE_CONTEXT
let game:Game|undefined, app:Application|undefined, gameContext:GameContext|undefined, world:Container|undefined
let phase:'menu'|'playing'|'paused'|'game-over'='menu',hostPaused=false,manualPaused=false,disposed=false
let score=0,lives=3,waveLabel='',last=0,fireClock=0,dragPointer:number|null=null,toastTimer=0
const held=new Set<string>(),keyboardHeld=new Set<string>(),pointers=new Map<number,string>()
const events=new Map<string,Set<(action?:string)=>void>>()
let virtualWidth=420,virtualHeight=640,scale=1,top=56
let soundEnabled=true,audio:AudioContext|undefined
const word=(key:string)=>COPY[context.locale][key as keyof typeof COPY.en]??key
function sound(name:string){
  if(!soundEnabled||hostPaused||manualPaused||!audio)return
  if(audio.state==='suspended')void audio.resume().catch(()=>{})
  const oscillator=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime
  oscillator.type=name==='explosion'?'sawtooth':'square'
  const frequency=name==='shoot'?650:name==='powerup'?1000:name==='hit'?170:340
  oscillator.frequency.setValueAtTime(frequency,now);oscillator.frequency.exponentialRampToValueAtTime(Math.max(60,frequency*.25),now+.09)
  gain.gain.setValueAtTime(.035,now);gain.gain.exponentialRampToValueAtTime(.0001,now+.12)
  oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(now);oscillator.stop(now+.13)
}
function unlock(){if(!audio){try{audio=new AudioContext()}catch{}}if(audio?.state==='suspended')void audio.resume().catch(()=>{})}
function emit(name:string,action?:string){events.get(name)?.forEach(fn=>fn(action))}
const input={targetX:null as number|null,axis:()=>({x:(held.has('right')?1:0)-(held.has('left')?1:0),y:0}),on(name:string,fn:(action?:string)=>void){const list=events.get(name)??new Set();list.add(fn);events.set(name,list);return()=>list.delete(fn)}}
function syncHeld(){held.clear();for(const action of [...keyboardHeld,...pointers.values()])held.add(action);if(dragPointer!==null)held.add('fire')}
function clearInput(){held.clear();keyboardHeld.clear();pointers.clear();dragPointer=null;input.targetX=null;fireClock=0}
function copy(){
  el('title').textContent=phase==='game-over'?word('over'):manualPaused?word('paused'):word('title')
  el('description').textContent=phase==='game-over'?`${word('score')} ${score}`:word('description')
  start.textContent=manualPaused?word('resume'):phase==='game-over'?word('again'):word('start')
  el('score-label').textContent=word('score');el('drag-tip').textContent=word('drag');el('fire').textContent=word('fire')
  el('lives').textContent='♥'.repeat(Math.max(0,lives));el('wave').textContent=waveLabel
  for(const id of ['pause','sound','left','right'])el(id).setAttribute('aria-label',word(id))
  el('credits').textContent='C0deWiz4rd010 · MIT · XM Games'
  canvas.setAttribute('aria-label',word('title'))
  game?.refresh()
}
function resize(){
  if(!app||!world)return
  const width=innerWidth,height=innerHeight,short=height<500&&width>height
  top=short?46:60
  const bottom=short?62:94
  const available=Math.max(180,height-top-bottom)
  // The upstream portrait game is tuned for 600 logical pixels of reaction space.
  virtualHeight=Math.max(short?420:600,available);scale=available/virtualHeight;virtualWidth=width/scale
  app.renderer.resize(width,height)
  world.position.set(0,top);world.scale.set(scale)
  game?.resize(virtualWidth,virtualHeight)
}
function stopOrResume(){clearInput();if(audio){if(hostPaused||manualPaused)void audio.suspend().catch(()=>{});else if(audio.state==='suspended')void audio.resume().catch(()=>{})}}
function newGame(){
  unlock();game?.destroy();events.clear();clearInput();manualPaused=false;phase='playing';overlay.hidden=true
  gameContext={stage:world!,width:virtualWidth,height:virtualHeight,palette:context.palette,input,audio:{sfx:sound},rng:new RNG(Date.now()),
    hud:{setScore(n){score=n;el('score').textContent=String(n)},setLives(n){lives=n;el('lives').textContent='♥'.repeat(Math.max(0,n))},setLabel(label){waveLabel=label;el('wave').textContent=label},toast(message){el('toast').textContent=message;el('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>el('toast').classList.remove('show'),1400)}},
    word,gameOver(n){score=n;phase='game-over';clearInput();overlay.hidden=false;copy()},
  }
  game=createGame(gameContext);copy();last=performance.now()
}
const bridge=connectArcadeHost({gameId:'galaga',onContext(next){context=next;if(gameContext)gameContext.palette=next.palette;if(app?.renderer)app.renderer.background.color=next.palette.canvas;copy()},onPause(value){hostPaused=value;stopOrResume();last=performance.now()},getState(){return{...game?.snapshot(),phase:hostPaused?'paused':manualPaused?'paused':phase,score,lives,hostPaused,manualPaused,controls:{left:held.has('left'),right:held.has('right'),fire:held.has('fire'),dragging:dragPointer!==null},viewport:{width:virtualWidth,height:virtualHeight}}}})
start.addEventListener('click',()=>{if(hostPaused)return;if(manualPaused){manualPaused=false;phase='playing';overlay.hidden=true;stopOrResume();last=performance.now()}else newGame()})
el('pause').addEventListener('click',()=>{if(phase!=='playing'&&phase!=='paused')return;manualPaused=!manualPaused;phase=manualPaused?'paused':'playing';overlay.hidden=!manualPaused;stopOrResume();copy()})
el('sound').addEventListener('click',()=>{soundEnabled=!soundEnabled;el('sound').setAttribute('aria-pressed',String(soundEnabled));if(!soundEnabled)void audio?.suspend();else unlock()})
const controls=new AbortController(),signal=controls.signal
for(const id of ['left','right','fire']){
  const button=el(id)
  button.addEventListener('pointerdown',event=>{if(hostPaused||phase!=='playing'||manualPaused)return;event.preventDefault();unlock();button.setPointerCapture(event.pointerId);pointers.set(event.pointerId,id);held.add(id);input.targetX=null;if(id==='fire')emit('down','a')},{signal})
  const release=(event:PointerEvent)=>{pointers.delete(event.pointerId);syncHeld()}
  button.addEventListener('pointerup',release,{signal});button.addEventListener('pointercancel',release,{signal});button.addEventListener('lostpointercapture',release,{signal})
}
canvas.addEventListener('pointerdown',event=>{if(phase!=='playing'||hostPaused||manualPaused||dragPointer!==null)return;unlock();event.preventDefault();dragPointer=event.pointerId;canvas.setPointerCapture(event.pointerId);input.targetX=event.clientX/scale;syncHeld();emit('down','a')},{signal})
canvas.addEventListener('pointermove',event=>{if(event.pointerId===dragPointer)input.targetX=event.clientX/scale},{signal})
const releaseDrag=(event:PointerEvent)=>{if(event.pointerId===dragPointer){dragPointer=null;input.targetX=null;syncHeld()}}
canvas.addEventListener('pointerup',releaseDrag,{signal});canvas.addEventListener('pointercancel',releaseDrag,{signal});canvas.addEventListener('lostpointercapture',releaseDrag,{signal})
window.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','KeyA','KeyD','Space','KeyP'].includes(event.code))return;event.preventDefault();if(event.code==='KeyP'){if(!event.repeat)el('pause').click();return}if(phase!=='playing'||hostPaused||manualPaused)return;unlock();input.targetX=null;const action=event.code==='Space'?'fire':['ArrowLeft','KeyA'].includes(event.code)?'left':'right';keyboardHeld.add(action);syncHeld();if(action==='fire'&&!event.repeat)emit('down','a')},{signal})
window.addEventListener('keyup',event=>{if(!['ArrowLeft','ArrowRight','KeyA','KeyD','Space'].includes(event.code))return;keyboardHeld.delete(event.code==='Space'?'fire':['ArrowLeft','KeyA'].includes(event.code)?'left':'right');syncHeld()},{signal})
window.addEventListener('blur',clearInput,{signal});window.addEventListener('resize',resize,{signal})
void(async()=>{
  try{
    app=new Application();await app.init({width:innerWidth,height:innerHeight,background:context.palette.canvas,antialias:true,resolution:Math.min(devicePixelRatio||1,2),autoDensity:true,preference:'webgl'})
    if(disposed){app.destroy(true,{children:true});return}
    app.renderer.background.color=context.palette.canvas
    canvas.appendChild(app.canvas);world=new Container();app.stage.addChild(world);resize();copy()
    app.ticker.add(()=>{
      const now=performance.now(),dt=Math.min((now-last)/1000,.04);last=now
      if(hostPaused||manualPaused||phase!=='playing')return
      if(held.has('fire')){fireClock+=dt;if(fireClock>=.16){fireClock=0;emit('down','a')}}else fireClock=0
      game?.update(dt)
    });last=performance.now();start.disabled=false;bridge.ready()
  }catch(error){bridge.fail(error instanceof Error?error.message:'Unable to start Star Squadron');el('description').textContent='Unable to start the game. Please reload.'}
})()
window.addEventListener('pagehide',event=>{if(event.persisted)return;disposed=true;controls.abort();clearTimeout(toastTimer);game?.destroy();if(app?.renderer)app.destroy(true,{children:true});void audio?.close();bridge.dispose()})
