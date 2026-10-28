let context;
let muted=false;
globalThis.Howler={mute(value){muted=!!value;if(muted)void context?.suspend();else if(context?.state==='suspended')void context.resume().catch(()=>{})},stop(){void context?.suspend()}};
$.unlockAudio=()=>{try{context??=new AudioContext();if(!muted&&context.state==='suspended')void context.resume().catch(()=>{})}catch{}};
$.pauseAudio=value=>{if(value)void context?.suspend();else if(!muted&&context?.state==='suspended')void context.resume().catch(()=>{})};
$.closeAudio=()=>void context?.close();
$.audio={play(key){
  if(context&&!muted&&$.state==='play'){
    const now=context.currentTime,o=context.createOscillator(),g=context.createGain();
    const noise=/explosion|death|hit|Damage/.test(key),frequency=noise?90:key==='powerup'?1000:key==='levelup'?800:500;
    o.type=noise?'sawtooth':'square';o.frequency.setValueAtTime(frequency,now);o.frequency.exponentialRampToValueAtTime(Math.max(30,frequency*.2),now+.08);
    g.gain.setValueAtTime(noise ? .035 : .018,now);g.gain.exponentialRampToValueAtTime(.0001,now+.11);o.connect(g);g.connect(context.destination);o.start(now);o.stop(now+.12);
  }
  return{rate(){return this},stop(){}};
}};
