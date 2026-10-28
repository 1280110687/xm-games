let clock=0;let jobs:{at:number,callback:()=>void}[]=[];
export function schedule(callback:()=>void,delay=0){const job={at:clock+delay,callback};jobs.push(job);return job;}
export function tickTimers(ms:number){clock+=ms;const due=jobs.filter(j=>j.at<=clock);jobs=jobs.filter(j=>j.at>clock);for(const j of due)j.callback();}
export function clearTimers(){jobs=[];clock=0;}
export const timerNow=()=>clock;
