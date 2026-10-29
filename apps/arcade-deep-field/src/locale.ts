type Locale = 'en' | 'zh' | 'th' | string;
const dictionary:Record<string,[string,string]>={
'Deep Field':['深空防线','แนวป้องกันห้วงอวกาศ'],'Build stations, defend the route, clear all eight sectors.':['建造防御塔，守住路线，挑战八大战区。','สร้างป้อม ปกป้องเส้นทาง และพิชิตทั้งแปดเขต'],'Difficulty':['难度','ความยาก'],'Recon':['侦察 · 简单','ลาดตระเวน · ง่าย'],'Standard':['标准','มาตรฐาน'],'Blackout':['暗域 · 困难','มืดสนิท · ยาก'],'Sector':['战区','เขต'],'waves':['波敌人','ระลอก'],
'Choose a station, then tap a free tile. Hold and release to build on touch screens. Tap a built station to upgrade it.':['选择防御塔后点击空地；触屏可长按瞄准，松手建造。点击已建防御塔进行升级。','เลือกป้อมแล้วแตะช่องว่าง บนจอสัมผัสให้กดค้างแล้วปล่อยเพื่อสร้าง แตะป้อมที่สร้างแล้วเพื่ออัปเกรด'],
'last wave out':['全部波次已出发','ส่งครบทุกระลอกแล้ว'],'Contacts killed':['击杀数','ศัตรูที่กำจัด'],'Leaks':['漏防数','ศัตรูที่หลุดผ่าน'],'Lives kept':['剩余生命','พลังชีวิตที่เหลือ'],'Time':['用时','เวลาที่ใช้'],'Core lost':['核心失守','เสียแกนกลาง'],'Sorties taken':['遭遇突袭','การโจมตีที่รับมา'],'CORE BREACHED':['敌人突破防线','ศัตรูทะลุแนวป้องกัน'],'clear bonus':['清波奖励','โบนัสผ่านระลอก'],'leaked':['漏防','หลุดผ่าน'],'The whole route was covered.':['整条路线均在防御塔射程内。','เส้นทางทั้งหมดอยู่ในระยะยิงของป้อมแล้ว'],'Every sector held. The grades are still there to beat — and Blackout is still waiting.':['所有战区均已守住。你可以继续提升评分，或挑战暗域难度。','ป้องกันครบทุกเขตแล้ว ลองทำคะแนนให้สูงขึ้นหรือท้าทายระดับมืดสนิทได้'],'Low':['低','เบา'],'Mid':['中','ปานกลาง'],'High':['高','ดัง'],'Back to sectors':['返回选关','กลับไปเลือกเขต'],'Cash':['资金','เงิน'],'Lives':['生命','พลังชีวิต'],'Waves held':['已守波数','ระลอกที่ผ่าน'],'Era':['时代','ยุค'],'Build':['建造','สร้าง'],'Deck':['控制面板','แผงควบคุม'],'Pause':['暂停','หยุดพัก'],'Paused':['已暂停','หยุดชั่วคราว'],'Resume':['继续','เล่นต่อ'],'Restart sector':['重新开始本关','เริ่มเขตใหม่'],'Retry sector':['重试战区','ลองเขตนี้อีกครั้ง'],'Choose another sector':['选择其他战区','เลือกเขตอื่น'],'Choose a sector':['选择战区','เลือกเขต'],'Play again':['再玩一次','เล่นอีกครั้ง'],'Play it again':['再玩一次','เล่นอีกครั้ง'],'Sector lost':['防线失守','เสียเขตแล้ว'],'Sector held':['战区守住了','รักษาเขตสำเร็จ'],'Campaign complete':['战役完成','ผ่านแคมเปญแล้ว'],'Reach circles':['射程圈','วงระยะยิง'],'Damage numbers':['伤害数值','ตัวเลขความเสียหาย'],'Route current':['路线流光','การเคลื่อนไหวเส้นทาง'],'Sound':['声音','เสียง'],'On':['开启','เปิด'],'Off':['关闭','ปิด'],'Hover':['选中显示','ชี้เพื่อแสดง'],'Always':['一直显示','แสดงเสมอ'],'Sell':['出售','ขาย'],'Dmg':['伤害','พลังโจมตี'],'Rate':['攻速','ความเร็วโจมตี'],'Range':['射程','ระยะ'],'Max':['满级','สูงสุด'],'Cancel':['取消','ยกเลิก'],'First':['最前','ตัวแรก'],'Last':['最后','ตัวท้าย'],'Strong':['最强','แข็งแกร่งสุด'],'Near':['最近','ใกล้สุด'],'No waves left':['全部波次已出','ไม่มีระลอกเหลือ'],'Clear the board to finish':['消灭剩余敌人即可通关','กำจัดศัตรูที่เหลือให้หมด'],'Wait for it to finish spawning':['等待本波全部出现','รอศัตรูระลอกนี้ออกมาครบ'],'Sending early pays the remaining timer as cash':['提前出怪可获得额外资金','ส่งเร็วกว่ากำหนดเพื่อรับเงินเพิ่ม'],'Auto':['自动','อัตโนมัติ'],'Next grade up':['下一评分目标','เป้าหมายระดับถัดไป'],'Banked':['结余资金','เงินคงเหลือ'],'What broke':['失守分析','สาเหตุที่พลาด'],'Top rung':['最高时代','ยุคสูงสุด'],
'Nova':['新星塔','โนวา'],'Filament':['丝束塔','เส้นใย'],'Overclock':['超频塔','โอเวอร์คล็อก'],'Solvent':['溶蚀塔','ตัวละลาย'],'Breaker':['破甲塔','ตัวทำลาย'],'Ember':['余烬塔','ถ่านไฟ'],'Repulsor':['斥力塔','แรงผลัก'],'Salvage':['回收塔','กู้ซาก'],'Sentinel':['哨卫塔','ยาม'],'Needle':['针塔','เข็ม'],'Lance':['长枪塔','หอก'],'Mortar':['迫击炮','ปืนครก'],'Frost':['冰霜塔','น้ำแข็ง'],'Arc':['电弧塔','สายฟ้า'],'Prism':['棱镜塔','ปริซึม'],'Pulse':['脉冲塔','พัลส์'],'Venom':['毒液塔','พิษ'],'Beacon':['信标塔','ประภาคาร'],'Singularity':['奇点塔','ภาวะเอกฐาน'],'Flak':['防空塔','ปืนสะเก็ด'],'Shredder':['碎甲塔','เครื่องบด'],'Switchback':['折返防线','เส้นทางวกกลับ'],'Cascade':['层叠防线','เส้นทางลดหลั่น'],'Pincer':['钳形防线','แนวคีม'],'Fork':['分叉防线','ทางแยก'],'Delta':['三角防线','สามเหลี่ยม'],'Braid':['交织防线','ทางถัก'],'Sluice':['闸门防线','ประตูน้ำ'],'Crown':['王冠防线','มงกุฎ']};
export function tr(locale:Locale,text:string){if(locale==='en')return text;const value=dictionary[text];return value?value[locale==='th'?1:0]:text;}
let getLocale:()=>Locale=()=> 'en';
const records=new WeakMap<Text,{source:string,rendered:string}>();
/** Match complete dynamic messages before translating short HUD labels. */
function sentence(text:string,locale:Locale):string|null {
  const say=(zh:string,th:string)=>locale==='th'?th:zh;
  let m:RegExpMatchArray|null;
  if((m=text.match(/^The core went dark on wave (\d+)$/)))return say(`核心在第 ${m[1]} 波失守`,`แกนกลางถูกทำลายในระลอกที่ ${m[1]}`);
  if((m=text.match(/^All (\d+) waves turned back$/)))return say(`成功挡住全部 ${m[1]} 波敌人`,`ป้องกันศัตรูสำเร็จครบ ${m[1]} ระลอก`);
  if((m=text.match(/^(\d+) of (\d+) route tiles had no station in reach(?: — most of them (on the last approach|near the entry|through the middle))?\.$/))){
    const [,gaps,total,where]=m;
    if(gaps===total)return say(`路线共 ${total} 格，全部未被防御塔覆盖。`,`เส้นทางทั้ง ${total} ช่องยังไม่มีป้อมครอบคลุม`);
    const zhWhere=where==='on the last approach'?'空缺主要位于靠近核心的最后一段。':where==='near the entry'?'空缺主要位于入口附近。':where==='through the middle'?'空缺主要位于路线中段。':'';
    const thWhere=where==='on the last approach'?'ส่วนใหญ่อยู่ช่วงสุดท้ายก่อนถึงแกนกลาง':where==='near the entry'?'ส่วนใหญ่อยู่ใกล้ทางเข้า':where==='through the middle'?'ส่วนใหญ่อยู่ช่วงกลางเส้นทาง':'';
    return say(`路线共 ${total} 格，其中 ${gaps} 格未被防御塔覆盖。${zhWhere}`,`จากเส้นทาง ${total} ช่อง มี ${gaps} ช่องที่ป้อมยิงไม่ถึง ${thWhere}`.trim());
  }
  if((m=text.match(/^Hold all (\d+) lives and finish under (\d+:\d{2})\. Sending waves early does both at once\.$/)))return say(`保住全部 ${m[1]} 点生命，并在 ${m[2]} 内通关。提前派出波次有助于同时达成这两个目标。`,`รักษาพลังชีวิตให้ครบ ${m[1]} และผ่านด่านภายใน ${m[2]} การส่งระลอกก่อนเวลาช่วยให้บรรลุทั้งสองเป้าหมาย`);
  if((m=text.match(/^Let nothing through — you leaked (\d+) this run — and finish under (\d+:\d{2})\. Sending waves early does both at once\.$/)))return say(`争取不让任何敌人突破防线，并在 ${m[2]} 内通关。本局有 ${m[1]} 名敌人漏防；提前派出波次有助于缩短通关时间。`,`อย่าให้ศัตรูหลุดผ่าน และผ่านด่านภายใน ${m[2]} รอบนี้หลุดไป ${m[1]} ตัว การส่งระลอกก่อนเวลาช่วยลดเวลาผ่านด่าน`);
  if((m=text.match(/^left over becomes your entire starting budget on (.+) — it replaces the usual amount rather than adding to it\. Coming back to this sector from the menu always starts fresh\.$/))){const name=tr(locale,m[1]);return say(` 将作为下一战区「${name}」的全部初始资金，替代常规额度（不叠加）。从选关菜单重新进入本战区时，将按常规初始资金重新开始。`,` จะเป็นเงินเริ่มต้นทั้งหมดของเขต ${name} โดยใช้แทนเงินปกติ ไม่ได้นำมาบวกกัน หากกลับมาเล่นเขตนี้จากเมนูจะเริ่มด้วยเงินปกติใหม่`);}
  if((m=text.match(/^Next sector: (.+)$/)))return say(`下一战区：${tr(locale,m[1])}`,`เขตถัดไป: ${tr(locale,m[1])}`);
  if((m=text.match(/^with \$(\d+)$/)))return say(`携带 $${m[1]}`,`พร้อมเงิน $${m[1]}`);
  if((m=text.match(/^Wave (\d+) cleared$/)))return say(`第 ${m[1]} 波已清除`,`ผ่านระลอกที่ ${m[1]} แล้ว`);
  if((m=text.match(/^bounty · (\d+) kills$/)))return say(`击杀奖励 · ${m[1]} 次击杀`,`รางวัลกำจัดศัตรู · ${m[1]} ตัว`);
  if((m=text.match(/^(\d+) lives? remaining$/)))return say(`剩余 ${m[1]} 点生命`,`เหลือพลังชีวิต ${m[1]}`);
  if((m=text.match(/^wave (\d+) · in (\d+)s$/)))return say(`第 ${m[1]} 波 · ${m[2]} 秒后出发`,`ระลอกที่ ${m[1]} · อีก ${m[2]} วินาที`);
  if((m=text.match(/^wave (\d+) · sending$/)))return say(`第 ${m[1]} 波 · 即将出发`,`ระลอกที่ ${m[1]} · กำลังส่ง`);
  if((m=text.match(/^Wave (\d+) running$/)))return say(`第 ${m[1]} 波进行中`,`ระลอกที่ ${m[1]} กำลังมา`);
  if((m=text.match(/^Send wave (\d+)$/)))return say(`派出第 ${m[1]} 波`,`ส่งระลอกที่ ${m[1]}`);
  if((m=text.match(/^(\d+) of (\d+)$/)))return `${m[1]} / ${m[2]}`;
  if((m=text.match(/^of (\d+)$/)))return `/ ${m[1]}`;
  return null;
}
function dynamic(text:string,locale:Locale,resultText=false){
  if(locale==='en')return text;
  const exact=tr(locale,text);
  if(exact!==text)return exact;
  const complete=sentence(text,locale);
  if(complete!==null)return complete;
  // Result prose must never be rewritten word by word. Unrecognised future
  // messages remain intact, rather than turning English grammar into fragments.
  if(resultText)return text;
  const parts=text.split(' · ');
  if(parts.length>1&&dictionary[parts[0]])return [tr(locale,parts[0]),...parts.slice(1)].join(' · ');
  const words:Record<string,[string,string]>={'Build':['建造','สร้าง'],'Dmg':['伤害','โจมตี'],'DMG':['伤害','โจมตี'],'RATE':['攻速','ความเร็ว'],'REACH':['射程','ระยะ'],'RNG':['射程','ระยะ'],'Sell':['出售','ขาย'],'kills':['击杀','สังหาร'],'Pierce':['穿透','ทะลุ'],'Effect':['特效','เอฟเฟกต์'],'Cancel placement':['取消建造','ยกเลิกการสร้าง'],'Passes through':['可穿透','ทะลุผ่าน'],'more':['个目标','เป้าหมายเพิ่ม'],'hits':['命中','โดน'],'damage':['伤害','ความเสียหาย'],'dealt':['累计','รวม'],'Wave':['波次','ระลอก'],'wave':['波次','ระลอก'],'short':['还差','ขาด'],'placing':['放置中','กำลังวาง'],'armed':['已选中','พร้อมวาง']};
  let result=text;
  for(const [a,b]of Object.entries(words))result=result.replace(new RegExp('\\b'+a+'\\b','g'),b[locale==='th'?1:0]);
  return result;
}
export function translateHud(){const root=document.getElementById('hud');if(!root)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n:Node|null;while((n=walker.nextNode())){const node=n as Text;if(node.parentElement?.closest('svg,style,script'))continue;const old=records.get(node);const source=old&&node.data===old.rendered?old.source:node.data;const trimmed=source.trim();if(!trimmed)continue;const rendered=source.replace(trimmed,dynamic(trimmed,getLocale(),!!node.parentElement?.closest('.card.lost,.card.won,.card.toast,.breach')));records.set(node,{source,rendered});if(node.data!==rendered)node.data=rendered;}root.querySelectorAll('[aria-label]').forEach(el=>{const old=el.getAttribute('data-original-aria')??el.getAttribute('aria-label')!;el.setAttribute('data-original-aria',old);el.setAttribute('aria-label',dynamic(old,getLocale()));});}
export function installTranslations(locale:()=>Locale){getLocale=locale;let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;translateHud();});}).observe(document.getElementById('hud')!,{childList:true,subtree:true,characterData:true});}
