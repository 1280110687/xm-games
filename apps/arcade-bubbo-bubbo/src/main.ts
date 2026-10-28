import 'pixi.js/unsafe-eval';
import { Application, Container, Text } from 'pixi.js';
import gsap from 'gsap';
import { connectArcadeHost, DEFAULT_ARCADE_CONTEXT } from '../../../packages/arcade-bridge/src/index';
import { repaintArt } from './art';
import { setLocale,localizeText } from './locale';
import { navigation } from '../upstream/src/navigation';
import { storage } from '../upstream/src/storage';
import { TitleScreen } from '../upstream/src/screens/TitleScreen';
import { GameScreen } from '../upstream/src/screens/GameScreen';
import { audio } from '../upstream/src/audio';
import { CannonSystem } from '../upstream/src/game/systems/CannonSystem';

export const app=new Application();
let context=DEFAULT_ARCADE_CONTEXT,booted=false,paused=false;
const activePointers=new Set<number>();
const paintedTexts=new WeakMap<Text,number>();
const localizedTexts=new WeakMap<Text,string>();
function paintTexts(node:Container){if(node instanceof Text&&localizedTexts.get(node)!==context.locale){localizeText(node);localizedTexts.set(node,context.locale);}if(node instanceof Text&&paintedTexts.get(node)!==context.palette.ink){node.style.fill=context.palette.ink;paintedTexts.set(node,context.palette.ink);}for(const child of node.children??[])paintTexts(child as Container);}
const host=connectArcadeHost({gameId:'bubbo-bubbo',onContext(next){const old=context;context=next;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',`#${next.palette.canvas.toString(16).padStart(6,'0')}`);repaintArt(next.palette);setLocale(next.locale,booted?app.stage:undefined);document.documentElement.lang=next.locale;if(booted){app.renderer.background.color=next.palette.canvas;if(old.palette.ink!==next.palette.ink){const paint=(node:Container)=>{if(node instanceof Text)node.style.fill=next.palette.ink;for(const child of node.children??[])paint(child as Container);};paint(app.stage);}}},onPause(value){paused=value;if(!booted)return;audio.pause(value);if(value){app.stage.eventMode='none';app.stop();gsap.globalTimeline.pause();const screen=navigation.getCurrentScreen();if(screen instanceof GameScreen){for(const pointerId of activePointers)app.canvas.dispatchEvent(new PointerEvent('pointercancel',{pointerId,bubbles:true}));activePointers.clear();}}else{app.stage.eventMode='auto';gsap.globalTimeline.resume();app.start();}},getState(){const screen=navigation.getCurrentScreen();return {...navigation.getState(),...(screen instanceof GameScreen?{...screen.getGame().stats.get(),gameOver:screen.getGame().isGameOver,shots:screen.getGame().systems.get(CannonSystem).shotCount}:{}),viewport:{width:innerWidth,height:innerHeight}};}});
function resize(){if(!booted)return;const box=document.querySelector<HTMLElement>('#game')!.getBoundingClientRect();const scale=Math.min(box.width/428,box.height/800);const w=box.width/scale,h=box.height/scale;app.renderer.resize(w,h);app.canvas.style.width=`${box.width}px`;app.canvas.style.height=`${box.height}px`;navigation.resize(w,h);}
async function boot(){repaintArt(context.palette);setLocale(context.locale);await app.init({background:context.palette.canvas,antialias:true,resolution:Math.min(devicePixelRatio||1,2),autoDensity:true,preference:'webgl',autoStart:false});document.querySelector('#game')!.append(app.canvas);app.canvas.addEventListener('pointerdown',e=>activePointers.add(e.pointerId));for(const event of ['pointerup','pointercancel'])app.canvas.addEventListener(event,e=>activePointers.delete((e as PointerEvent).pointerId));app.ticker.add(()=>paintTexts(app.stage));try{storage.readyStorage();}catch{/* Storage can be blocked in privacy modes. */}audio.muted(storage.getStorageItem('muted'));navigation.init();booted=true;resize();window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);await navigation.goToScreen(TitleScreen);document.querySelector<HTMLElement>('#boot')!.hidden=true;if(!paused)app.start();host.ready();}
void boot().catch(error=>{document.querySelector('#boot')!.textContent=context.locale.startsWith('zh')?'游戏加载失败，请重新进入':'Unable to load game';host.fail(String(error));});
