/** Local high score and sound preference, with a private-mode fallback. */
const DEFAULT_STORAGE={muted:false,highscore:0};
export type StorageData=typeof DEFAULT_STORAGE;
const STORAGE_ID='xm-arcade-bubbo-bubbo';
let memory={...DEFAULT_STORAGE};
export const storage={
 readyStorage(){this.getStorage();},
 getStorage():StorageData {try{const raw=localStorage.getItem(STORAGE_ID);if(raw){const data=JSON.parse(raw);memory={muted:typeof data.muted==='boolean'?data.muted:false,highscore:Number.isFinite(data.highscore)?Math.max(0,data.highscore):0};}}catch{}return {...memory};},
 getStorageItem<T extends keyof StorageData>(key:T):StorageData[T]{return this.getStorage()[key];},
 setStorageItem<T extends keyof StorageData>(key:T,value:StorageData[T]){memory[key]=value;this.setStorage(memory);return value;},
 setStorage(data:StorageData){memory={...data};try{localStorage.setItem(STORAGE_ID,JSON.stringify(memory));}catch{}}
};
