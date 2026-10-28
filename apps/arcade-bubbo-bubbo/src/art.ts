import { Cache, Texture } from 'pixi.js';
import type { ArcadePalette } from '../../../packages/arcade-bridge/src/index';
import sizes from './texture-sizes.json';

const drawings = new Map<string, { canvas: HTMLCanvasElement; texture: Texture }>();
const colours: Record<string,string> = {blue:'#5b98ff',red:'#ff738d',green:'#58dca1',yellow:'#ffcf62',bomb:'#ff738d',super:'#bba1ff',timer:'#72dfea'};
function draw(name: string, canvas: HTMLCanvasElement, p: Record<string,string>) {
 const c=canvas.getContext('2d')!; const w=canvas.width,h=canvas.height;
 c.clearRect(0,0,w,h); c.lineCap='round'; c.lineJoin='round';
 const round=(x:number,y:number,a:number,b:number,r:number,fill:string,stroke?:string)=>{c.beginPath();c.roundRect(x,y,a,b,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=Math.max(2,w*.012);c.stroke();}};
 const circle=(x:number,y:number,r:number,fill:string)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=fill;c.fill();};
 if(name.startsWith('background-tile')) { c.fillStyle=p.canvas;c.fillRect(0,0,w,h);c.fillStyle=p.canvasGrid;circle(w*.2,h*.25,1.1,p.canvasGrid);circle(w*.73,h*.68,.8,p.canvasGrid);return; }
 if(name==='top-tray'){c.fillStyle=p.canvas;c.fillRect(0,0,w,h);c.fillStyle=p.border;c.fillRect(0,h-2,w,2);return;}
 if(name.startsWith('bubble-') && name!=='bubble-reserve-ring' && name!=='bubble-reserve-base') {
  if(name==='bubble-shadow'){const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w*.48);g.addColorStop(0,'#ffffff50');g.addColorStop(1,'#ffffff00');circle(w/2,h/2,w*.48,g as unknown as string);return;}
  if(name==='bubble-shine'){c.strokeStyle='#ffffff88';c.lineWidth=w*.06;c.beginPath();c.arc(w/2,h/2,w*.37,3.6,4.6);c.stroke();return;}
  if(name==='bubble-glow'){const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'#ffffffbb');g.addColorStop(1,'#ffffff00');circle(w/2,h/2,w/2,g as unknown as string);return;}
  const key=name.replace('bubble-',''),colour=colours[key]??p.accent; const g=c.createRadialGradient(w*.35,h*.28,1,w*.5,h*.5,w*.5);g.addColorStop(0,'#ffffff');g.addColorStop(.23,colour);g.addColorStop(1,colour);circle(w/2,h/2,w*.455,g as unknown as string);c.strokeStyle='#ffffffbb';c.lineWidth=w*.025;c.beginPath();c.arc(w/2,h/2,w*.43,0,Math.PI*2);c.stroke();
  c.globalAlpha=.65;circle(w*.34,h*.28,w*.08,'#fff');c.globalAlpha=1;
  c.fillStyle='#122039';c.strokeStyle='#122039';c.lineWidth=w*.07;
  if(key==='bomb'){circle(w/2,h*.54,w*.18,'#182136');c.beginPath();c.moveTo(w*.56,h*.37);c.lineTo(w*.65,h*.23);c.stroke();}
  if(key==='timer'){c.beginPath();c.arc(w/2,h/2,w*.23,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(w/2,h*.34);c.lineTo(w/2,h/2);c.lineTo(w*.62,h*.58);c.stroke();}
  if(key==='super'){c.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?w*.12:w*.27;const x=w/2+Math.cos(a)*r,y=h/2+Math.sin(a)*r;if(i)c.lineTo(x,y);else c.moveTo(x,y);}c.closePath();c.fill();}
  return;
 }
 if(name.startsWith('cannon-')) {
  c.save();c.translate(w/2,h/2);
  if(name==='cannon-barrel'){round(-w*.2,-h*.43,w*.4,h*.5,w*.1,p.surface,p.border);round(-w*.25,-h*.44,w*.5,h*.07,w*.03,p.accent);}
  if(name==='cannon-main'){circle(0,0,w*.4,'#ffffff');circle(0,0,w*.3,'#b8b8b8');}
  if(name==='cannon-arrow'){c.fillStyle='#ffffff';c.beginPath();c.moveTo(0,-h*.48);c.lineTo(w*.12,-h*.36);c.lineTo(-w*.12,-h*.36);c.closePath();c.fill();}
  if(name==='cannon-top'){circle(0,h*.04,w*.21,p.surface);circle(0,h*.04,w*.13,p.accent);}
  c.restore();return;
 }
 if(name.startsWith('icon-')) {
  c.strokeStyle=p.ink;c.lineWidth=w*.105;
  if(name==='icon-pause'){round(w*.2,h*.15,w*.17,h*.7,w*.06,p.ink);round(w*.6,h*.15,w*.17,h*.7,w*.06,p.ink);}
  else if(name==='icon-back'){c.beginPath();c.moveTo(w*.66,h*.15);c.lineTo(w*.25,h/2);c.lineTo(w*.66,h*.85);c.stroke();}
  else {c.beginPath();c.moveTo(w*.18,h*.4);c.lineTo(w*.36,h*.4);c.lineTo(w*.58,h*.2);c.lineTo(w*.58,h*.8);c.lineTo(w*.36,h*.6);c.lineTo(w*.18,h*.6);c.closePath();c.stroke();if(name.endsWith('off')){c.beginPath();c.moveTo(w*.75,h*.35);c.lineTo(w*.95,h*.65);c.moveTo(w*.95,h*.35);c.lineTo(w*.75,h*.65);c.stroke();}else{c.beginPath();c.arc(w*.58,h/2,w*.28,-.9,.9);c.stroke();}}
  return;
 }
 if(name.startsWith('laser-line')) {const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#ffffff00');g.addColorStop(.5,name==='laser-line'?p.accent:'#ffffff35');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(0,0,w,h);return;}
 if(name==='shot-visualiser'||name==='bubble-reserve-ring'||name==='loading-circle') {c.strokeStyle=p.accent;c.lineWidth=w*.08;c.beginPath();c.arc(w/2,h/2,w*.4,0,Math.PI*2);c.stroke();return;}
 if(name==='satellite'){round(w*.25,h*.18,w*.5,h*.6,16,p.surface,p.border);round(0,h*.3,w*.23,h*.35,4,p.accent);round(w*.77,h*.3,w*.23,h*.35,4,p.accent);circle(w/2,h*.47,h*.12,p.accent);return;}
 if(name==='pixi-logo'){c.fillStyle=p.muted;c.font='600 34px Arial';c.textAlign='center';c.fillText('PIX I',w/2,h*.7);return;}
 if(name==='bubble-reserve-base'){circle(w/2,h/2,w*.46,p.surface);c.strokeStyle=p.border;c.lineWidth=3;c.stroke();return;}
 const isButton=name.includes('btn')||name.includes('button');
 const fill=p.surface;
 round(3,3,w-6,h-6,Math.min(24,h*.24),fill,isButton?p.accent:p.border);
 if(name==='game-side-border'){c.fillStyle=p.border;c.fillRect(0,0,w,h);}
 if(name==='top-tray'||name==='bottom-tray'){c.globalAlpha=.6;c.fillStyle=p.border;c.fillRect(0,name==='top-tray'?h-3:0,w,3);c.globalAlpha=1;}
}
export function repaintArt(p:ArcadePalette) {
 for(const [name,size] of Object.entries(sizes)) {
  let d=drawings.get(name);if(!d){const canvas=document.createElement('canvas');[canvas.width,canvas.height]=size;const texture=Texture.from(canvas);d={canvas,texture};drawings.set(name,d);Cache.set(name,texture);if(name==='pause-panel')Cache.set('images/pause-overlay/pause-panel.png',texture);}
  draw(name,d.canvas,Object.fromEntries(Object.entries(p).filter(([,v])=>typeof v==='number').map(([k,v])=>[k,`#${Number(v).toString(16).padStart(6,'0')}`])));d.texture.source.update();
 }
}
