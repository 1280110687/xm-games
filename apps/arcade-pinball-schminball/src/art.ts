import type { Canvas } from 'zcanvas';
import type { ArcadePalette } from '../../../packages/arcade-bridge/src/index';
import Tables from '../upstream/definitions/tables';
import { tableRails } from '../upstream/geometry';
const colors=(palette:ArcadePalette)=>Object.fromEntries(Object.entries(palette).map(([key,value])=>[key,typeof value==='number'?'#'+value.toString(16).padStart(6,'0'):value])) as Record<keyof ArcadePalette,string>;
function sheet(width:number,height:number,draw:(c:CanvasRenderingContext2D)=>void){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;draw(canvas.getContext('2d')!);return canvas;}
export async function refreshSprites(canvas:Canvas,palette:ArcadePalette){
 const p=colors(palette);
 await canvas.loadResource('ball',sheet(40,40,c=>{const g=c.createRadialGradient(12,10,1,20,20,21);g.addColorStop(0,'#fff');g.addColorStop(.32,p.ink);g.addColorStop(1,p.muted);c.fillStyle=g;c.beginPath();c.arc(20,20,19,0,Math.PI*2);c.fill();c.strokeStyle=p.accent;c.lineWidth=2;c.stroke();}));
 for(const [id,reverse] of [['flipper_left',false],['flipper_right',true]] as const){await canvas.loadResource(id,sheet(132,41,c=>{if(reverse){c.translate(132,0);c.scale(-1,1);}c.fillStyle=p.accent;c.beginPath();c.moveTo(20,2);c.lineTo(115,9);c.quadraticCurveTo(132,20,115,33);c.lineTo(20,39);c.arc(20,20,18,Math.PI/2,Math.PI*1.5);c.fill();c.strokeStyle=p.ink;c.lineWidth=2;c.stroke();c.fillStyle=p.surface;c.beginPath();c.arc(20,20,8,0,Math.PI*2);c.fill();}));}
}
export function tableArt(index:number,palette:ArcadePalette){const p=colors(palette);const table=Tables[index];return sheet(table.width,table.height,c=>{c.fillStyle=p.canvas;c.fillRect(0,0,table.width,table.height);const gradient=c.createLinearGradient(0,0,800,table.height);gradient.addColorStop(0,p.surface);gradient.addColorStop(1,p.canvas);c.fillStyle=gradient;c.fillRect(20,20,760,table.height-40);
 c.strokeStyle=p.border;c.lineWidth=1;for(let x=40;x<800;x+=40){c.beginPath();c.moveTo(x,0);c.lineTo(x,table.height);c.stroke();}for(let y=40;y<table.height;y+=40){c.beginPath();c.moveTo(0,y);c.lineTo(800,y);c.stroke();}
 for(const [x1,y1,x2,y2,width] of tableRails(table)){c.lineWidth=width;c.strokeStyle=p.accent;c.lineCap='round';c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.lineWidth=2;c.strokeStyle=p.ink;c.stroke();}
 c.textAlign='center';c.fillStyle=p.accent;c.font='700 42px system-ui';c.fillText(index===0?'XM / ORBIT':'XM / CASCADE',390,table.underworld?990:720);c.font='600 16px system-ui';c.fillStyle=p.muted;c.fillText('PINBALL SCHMINBALL',390,table.underworld?1025:752);
 for(const bumper of table.bumpers){c.fillStyle=p.surface;c.strokeStyle=p.accent;c.lineWidth=7;c.beginPath();c.arc(bumper.left+bumper.width/2,bumper.top+bumper.height/2,bumper.width/2,0,Math.PI*2);c.fill();c.stroke();c.fillStyle=p.accent;c.font='bold 13px system-ui';c.fillText('+500',bumper.left+bumper.width/2,bumper.top+bumper.height/2+5);}
 for(const group of table.triggerGroups)for(const trigger of group.triggers){if(trigger.visible===false)continue;c.strokeStyle=p.accent;c.lineWidth=3;c.beginPath();c.arc(trigger.left+trigger.width/2,trigger.top+trigger.height/2,trigger.width/2+5,0,Math.PI*2);c.stroke();}
 for(const [i,f]of table.flippers.entries()){c.fillStyle=p.muted;c.font='700 14px system-ui';c.fillText(i%2===0?'◀':'▶',f.left+66,f.top+75);}
 if(table.underworld){c.setLineDash([12,12]);c.strokeStyle=p.accent;c.lineWidth=3;c.beginPath();c.moveTo(40,table.underworld);c.lineTo(760,table.underworld);c.stroke();c.setLineDash([]);c.font='700 25px system-ui';c.fillText('↓ UNDERWORLD / BONUS ↓',400,table.underworld+60);}
 });}
