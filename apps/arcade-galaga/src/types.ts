import type { Container } from 'pixi.js'
import type { ArcadePalette } from '../../../packages/arcade-bridge/src/index'
import type { RNG } from '../upstream/rng'
export interface Game {
  update(dt:number):void
  destroy():void
  resize(width:number,height:number):void
  refresh():void
  snapshot():Record<string,unknown>
}
export interface GameContext {
  stage:Container
  width:number
  height:number
  palette:ArcadePalette
  input:{axis():{x:number,y:number};targetX:number|null;on(event:string,fn:(action?:string)=>void):()=>void}
  audio:{sfx(name:string):void}
  rng:RNG
  hud:{setScore(score:number):void;setLives(lives:number):void;setLabel(label:string):void;toast(message:string):void}
  word(key:string):string
  gameOver(score:number,custom?:Record<string,number>):void
}
