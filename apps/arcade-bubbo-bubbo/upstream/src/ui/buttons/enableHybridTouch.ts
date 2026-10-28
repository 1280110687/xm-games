import type {FancyButton} from '@pixi/ui';
import {isMobile} from 'pixi.js';
/** @pixi/ui binds only mouse events on desktop user agents. Hybrid devices still need touch and pen. */
export function enableHybridTouch(view:FancyButton){
 if(isMobile.any)return;
 view.on('pointerdown',e=>{if(e.pointerType!=='mouse')view.onDown.emit(view.button,e);});
 view.on('pointerup',e=>{if(e.pointerType!=='mouse')view.onUp.emit(view.button,e);});
 view.on('pointerupoutside',e=>{if(e.pointerType!=='mouse')view.onUpOut.emit(view.button,e);});
 view.on('pointertap',e=>{if(e.pointerType!=='mouse')view.onPress.emit(view.button,e);});
}
