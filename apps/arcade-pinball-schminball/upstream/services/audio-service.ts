// Original synthesized effects. No recordings, streams, or external requests.
let context:AudioContext|undefined;let master:GainNode|undefined;let enabled=true;let paused=false;
export function unlockAudio(){if(!enabled||paused)return;context??=new AudioContext();if(!master){master=context.createGain();master.gain.value=.12;master.connect(context.destination);}void context.resume();}
export function playSoundEffect(id:number){if(!enabled||paused||!context||context.state!=='running'||!master)return;const oscillator=context.createOscillator();const gain=context.createGain();const at=context.currentTime;oscillator.type=id===2?'sine':'triangle';oscillator.frequency.setValueAtTime([130,90,650,930,240,400,720][id]??420,at);oscillator.frequency.exponentialRampToValueAtTime(70,at+.09);gain.gain.setValueAtTime(.6,at);gain.gain.exponentialRampToValueAtTime(.001,at+.12);oscillator.connect(gain);gain.connect(master);oscillator.start(at);oscillator.stop(at+.13);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};}
export const enqueueTrack=(_id:string)=>{};
export const setFrequency=(_frequency?:number)=>{};
export function pauseAudio(value:boolean){paused=value;if(value)void context?.suspend();else if(enabled)void context?.resume();}
export function setSound(value:boolean){enabled=value;if(!value)void context?.suspend();else unlockAudio();}
export function disposeAudio(){void context?.close();context=undefined;master=undefined;}
