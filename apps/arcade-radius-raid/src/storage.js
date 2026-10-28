const defaults=()=>({mute:0,score:0,level:0,rounds:0,kills:0,bullets:0,powerups:0,time:0});
$.setupStorage=()=>{let saved;try{saved=JSON.parse(localStorage.getItem('xm-radius-raid:v1')||'null')}catch{}$.storage=defaults();if(saved&&typeof saved==='object')for(const key of Object.keys($.storage))if(Number.isFinite(saved[key])&&saved[key]>=0)$.storage[key]=saved[key];};
$.updateStorage=()=>{try{localStorage.setItem('xm-radius-raid:v1',JSON.stringify($.storage))}catch{}};
$.clearStorage=()=>{try{localStorage.removeItem('xm-radius-raid:v1')}catch{}$.storage=defaults();};
