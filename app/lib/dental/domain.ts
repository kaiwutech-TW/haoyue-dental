import {localize, type Locale} from './language.ts';
import {recordStep,type TraceStep} from './trace.ts';
import { randomUUID } from 'node:crypto';

export type Intent = 'book'|'reschedule'|'cancel'|'appointment_lookup'|'admin_faq'|'human_request'|'clinical_handoff'|'unclear';
export type Decision = {intent:Intent; date:string|null; doctor:string|null; period:'morning'|'afternoon'|'evening'|null; appointmentId:string|null; question:string|null};
export type Appointment = {scope?:string;id:string;patient:string;doctor:string;slot:string;version:number;status:'booked'|'cancelled'};
export type Receipt = {kind:'book'|'reschedule'|'cancel';before:Appointment|null;after:Appointment;at:string};
export type Message = {id:string;role:'user'|'assistant'|'staff';text:string;at:string};
export type Proposal = {before?:Appointment|null;id:string;session:string;revision:number;kind:'book'|'reschedule'|'cancel';appointmentId:string|null;version:number;doctor:string;slot:string;expires:number;result?:string};
export type Session = {scope?:string;createdAt?:number;lastReceipt?:Receipt;locale?:Locale;support?:'neutral'|'reassurance'|'frustration'|'step_by_step';trace?:TraceStep[];id:string;patient:string;revision:number;messages:Message[];intent:Intent;date:string|null;doctor:string|null;period:Decision['period'];appointmentId:string|null;handoff:boolean;proposal:string|null;options:{doctor:string;slot:string}[]};
export type Knowledge = {id:string;question:string;answer:string;source:string;approved:boolean};
export type Clinic = {inferenceEndpoint?:string;guard?:{buckets:Record<string,{count:number;until:number}>;sessions:Record<string,number>;daily:{day:string;reservedUsd:number};paused:boolean};sessions:Record<string,Session>;appointments:Appointment[];proposals:Record<string,Proposal>;events:{at:string;session:string;kind:string;detail:string}[];knowledge:Knowledge[];usage:{calls:number;reservedUsd:number};};
export const patients = [{id:'lin',name:'林小晴'},{id:'wu',name:'吳先生'}];
export const doctors=['陳醫師','林醫師'];
export function dateInTaipei(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function dayPlus(date:string,days:number){return new Date(Date.parse(date+'T12:00:00+08:00')+days*86400000).toISOString().slice(0,10);}
export function seed(now=new Date()):Clinic {return {sessions:{},appointments:[{id:'a-lin',patient:'lin',doctor:'陳醫師',slot:dayPlus(dateInTaipei(now),1)+'T14:00',version:1,status:'booked'},{id:'a-wu',patient:'wu',doctor:'林醫師',slot:dayPlus(dateInTaipei(now),2)+'T10:00',version:1,status:'booked'}],proposals:{},events:[],knowledge:[{id:'hours',question:'營業時間 門診 幾點',answer:'示範診所週一至週六 09:00–12:00、14:00–17:00、18:00–21:00，週日休診。實際可預約時間以時段卡為準。',source:'虛構診所行政政策 v1',approved:true},{id:'address',question:'地址 交通 停車 在哪',answer:'這是虛構診所示範，沒有實體看診地址，也不會建立真實掛號。',source:'虛構診所行政政策 v1',approved:true},{id:'price',question:'費用 價錢 多少 健保 掛號費',answer:'費用須由櫃台依實際療程與資格確認。這個示範不提供診療報價，也不收取任何費用。',source:'虛構診所行政政策 v1',approved:true}],usage:{calls:0,reservedUsd:0}};}
export function event(c:Clinic,s:string,kind:string,detail:string){c.events.push({at:new Date().toISOString(),session:s,kind,detail});c.events=c.events.slice(-300);}
export function message(s:Session,role:Message['role'],text:string){s.messages.push({id:randomUUID(),role,text:role==='assistant'?localize(text,s.locale):text,at:new Date().toISOString()});s.messages=s.messages.slice(-80);}
export function createSession(c:Clinic,patient='lin',locale:Locale='zh',isolated=false){if(!patients.some(p=>p.id===patient))throw Error('無效的示範患者'); const id=randomUUID(); const s:Session={id,patient,locale,createdAt:Date.now(),...(isolated?{scope:id}:{}),revision:0,messages:[],intent:'unclear',date:null,doctor:null,period:null,appointmentId:null,handoff:false,proposal:null,options:[]};if(isolated)c.appointments.push(...seed().appointments.map(a=>({...a,id:randomUUID(),scope:id})));c.sessions[id]=s;message(s,'assistant','您好，我是好約小幫手 🌿\n想預約、調整時間，或找櫃台聊聊，都可以告訴我。這裡是虛構診所示範，不會建立真實掛號。');return id;}
export function getSession(c:Clinic,id:string){const s=c.sessions[id];if(!s)throw Error('請重新開始示範');return s;}
export function own(c:Clinic,s:Session){return c.appointments.filter(a=>a.scope===s.scope&&a.patient===s.patient&&a.status==='booked');}
export function handoff(c:Clinic,s:Session,reason:string){s.handoff=true;s.proposal=null;s.options=[];recordStep(s,'handoff','已建立真人交接案件',reason+' 原預約維持不變，等待櫃台回覆。');event(c,s.id,'handoff',reason);message(s,'assistant',reason+'\n已建立示範交接案件，等待櫃台接手；目前尚未有人回覆。原預約維持不變。');}
export function ruleDecision(text:string,s?:Session,now=new Date()):Decision {
 const d:Decision={intent:'unclear',date:null,doctor:null,period:null,appointmentId:null,question:null};
 if(/\b(?:my|for) (?:mother|father|mom|dad|daughter|son|wife|husband|child)\b|(?:幫|替).{0,4}(?:媽媽|爸爸|我媽|我爸|太太|先生|小孩|孩子|女兒|兒子|家父|家母|家人)|(?:我媽|我爸|媽媽|爸爸|家人|孩子|女兒|兒子|家父|家母)的/i.test(text))d.intent='human_request';
 else if(/真人|人工|櫃台|專人|\b(?:human|staff|receptionist|front desk)\b/i.test(text))d.intent='human_request';
 else if(/痛|腫|流血|發燒|藥|診斷|拔牙後|症狀|吞嚥|吞東西|呼吸|喘|\b(?:pain|swelling|bleeding|fever|medicine|diagnos|breathing|symptom)\w*/i.test(text))d.intent='clinical_handoff';
 else if(/改|換時間|延後|提前|reschedul|change.*(?:time|appointment)|move.*(?:appointment|booking)/i.test(text))d.intent='reschedule';
 else if(/取消|cancel/i.test(text)&&!/不是取消|不要取消|don.t cancel|not cancel/i.test(text))d.intent='cancel';
 else if(/先不要|不要了/.test(text))d.question='您想取消，還是改到其他時間呢？我先保留原預約。';
 else if(/預約|掛號|洗牙|\bbook(?:ing)?\b|make an appointment/i.test(text))d.intent='book';
 else if(/查|哪天|原本|什麼時候|check.*appointment|when.*appointment|look up/i.test(text))d.intent='appointment_lookup';
 else if(/時間|幾點|地址|交通|停車|費用|價錢|多少|健保|營業|hours|address|parking|fees|cost|price/i.test(text))d.intent='admin_faq';
 const today=dateInTaipei(now); const explicit=text.match(/(20\d{2})[-/](\d{1,2})[-/](\d{1,2})/);
 if(explicit)d.date=`${explicit[1]}-${explicit[2].padStart(2,'0')}-${explicit[3].padStart(2,'0')}`;
 else if(/後天|day after tomorrow/i.test(text))d.date=dayPlus(today,2);else if(/明天|tomorrow/i.test(text))d.date=dayPlus(today,1);else if(/今天|today/i.test(text))d.date=today;
 else {const w=text.match(/(?:禮拜|星期|週)([一二三四五六日天])/);if(w){const target='日一二三四五六'.indexOf(w[1]==='天'?'日':w[1]);const current=new Date(today+'T12:00:00+08:00').getUTCDay();let delta=(target-current+7)%7;if(/下(?:週|星期|禮拜)/.test(text))delta+=7;d.date=dayPlus(today,delta);}}
 d.doctor=doctors.find(x=>text.includes(x))??(/dr\.? chen/i.test(text)?doctors[0]:/dr\.? lin/i.test(text)?doctors[1]:null);
 if(!d.date){const days=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];const index=days.findIndex(x=>text.toLowerCase().includes(x));if(index>=0){const current=new Date(today+'T12:00:00+08:00').getUTCDay();const delta=(index-current+7)%7;d.date=dayPlus(today,delta||7);}}
 if(/早上|上午|morning/i.test(text))d.period='morning';else if(/下午|afternoon/i.test(text))d.period='afternoon';else if(/晚上|晚間|evening/i.test(text))d.period='evening';
 if(/下班後|after work/i.test(text))d.question='下班後大約幾點方便呢？可以直接選下方的晚間時段。';
 if(d.intent==='unclear'&&!d.question&&(d.date||d.doctor||d.period)&&s&&['book','reschedule'].includes(s.intent))d.intent=s.intent;
 return d;
}
export function validDate(value:string){const stamp=Date.parse(value+'T12:00:00+08:00');return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(stamp)&&dateInTaipei(new Date(stamp))===value;}
export function available(c:Clinic,s:Session,now=new Date()) {const dates=s.date?[s.date]:[1,2,3,4,5,6].map(n=>dayPlus(dateInTaipei(now),n));const out:{doctor:string;slot:string}[]=[];for(const date of dates){if(!validDate(date)||date<dateInTaipei(now)||date>dayPlus(dateInTaipei(now),60)||new Date(date+'T12:00:00+08:00').getUTCDay()===0)continue;for(const doctor of s.doctor?[s.doctor]:doctors)for(const time of ['09:00','10:00','11:00','14:00','15:00','16:00','18:00','19:00','20:00']){if(s.period==='morning'&&time>='12:00'||s.period==='afternoon'&&(time<'12:00'||time>='18:00')||s.period==='evening'&&time<'18:00')continue;const slot=date+'T'+time;if(Date.parse(slot+':00+08:00')<=now.getTime())continue;if(!c.appointments.some(a=>a.scope===s.scope&&a.status==='booked'&&a.doctor===doctor&&a.slot===slot))out.push({doctor,slot});}}return out.slice(0,18);}
export function applyDecision(c:Clinic,s:Session,d:Decision,text:string){
 event(c,s.id,'decision',JSON.stringify(d));
 recordStep(s,'decision','取得結構化意圖',JSON.stringify({intent:d.intent,date:d.date,doctor:d.doctor,period:d.period},null,2));
 if(d.intent==='clinical_handoff')return handoff(c,s,'這類症狀需要由醫療人員判斷，我無法提供診斷或用藥建議。');
 if(d.intent==='human_request')return handoff(c,s,'好的，我幫您留下訊息給櫃台。');
 if(d.intent==='appointment_lookup'){recordStep(s,'storage','讀取目前患者的預約','依目前會話的患者識別查詢，沒有寫入或異動預約。');message(s,'assistant',own(c,s).map(a=>`${a.doctor} · ${a.slot.replace('T',' ')}（台北時間）`).join('\n')||'目前沒有有效的示範預約。');return;}
 if(d.intent==='admin_faq'){const k=c.knowledge.find(k=>k.approved&&(k.question.split(/\s+/).some(w=>text.includes(w))||({hours:/hours|open|close/i,address:/address|parking|location/i,price:/cost|price|fees/i}[k.id]?.test(text)??false)));recordStep(s,'knowledge',k?'讀取已核准的診所知識':'找不到已核准答案',k?`來源：${k.source}。本次沒有呼叫 Tavily；Tavily 研究由管理員發起並審核。`:'不採用未核准的搜尋結果。');message(s,'assistant',k?k.answer:'這項資訊還沒有經過診所確認，我可以幫您轉交櫃台。');return;}
 if(d.intent==='unclear'){message(s,'assistant',d.question??'我想再確認一下，您是要預約、改期、取消，還是查詢原本的時間呢？');return;}
 if(s.intent!==d.intent){s.date=null;s.period=null;s.doctor=null;s.appointmentId=null;}s.intent=d.intent;
 if(d.date)s.date=d.date;if(d.doctor)s.doctor=d.doctor;if(d.period)s.period=d.period;
 const appointments=own(c,s);if(d.appointmentId&&!appointments.some(a=>a.id===d.appointmentId)){message(s,'assistant','找不到屬於您的有效預約，請重新選擇。');return;}if(d.appointmentId)s.appointmentId=d.appointmentId;
 if(d.intent==='reschedule'||d.intent==='cancel'){
  if(!appointments.length){message(s,'assistant','目前沒有可以異動的預約。您想新增預約嗎？');return;}
  if(appointments.length>1&&!s.appointmentId){message(s,'assistant','您有多筆預約，請先點選想調整的那一筆。');return;}
  const a=appointments.find(a=>a.id===s.appointmentId)??appointments[0];s.appointmentId=a.id;if(!s.doctor)s.doctor=a.doctor;
  if(d.intent==='cancel'){propose(c,s,null);return;}
 }
 s.options=available(c,s);recordStep(s,'validation','檢查預約規則與可用時段',`依患者歸屬、門診日期、醫師及已占用時段篩選，找到 ${s.options.length} 個選項。尚未變更預約。`);message(s,'assistant',(/下班後|after work/i.test(text)?'下班後大約幾點方便呢？可以直接選下方的晚間時段。':null)??(s.options.length?'沒問題，先幫您找時間 🌿\n請選擇方便的時段；還要再確認一次，才會變更預約。':'目前沒有符合條件的時段，方便換個日期或醫師嗎？'));
}
export function beginMessage(c:Clinic,id:string,text:string){const s=getSession(c,id);s.revision++;s.proposal=null;s.options=[];s.trace=[];recordStep(s,'input','收到患者訊息',text);message(s,'user',text);return s;}
export function propose(c:Clinic,s:Session,option:{doctor:string;slot:string}|null){
 if(s.handoff)throw Error('案件已轉交櫃台');if(!['book','reschedule','cancel'].includes(s.intent))throw Error('請先說明預約需求');
 const a=own(c,s).find(a=>a.id===s.appointmentId);if(s.intent!=='book'&&!a)throw Error('找不到可異動的預約');
 if(s.intent!=='cancel'&&(!option||!s.options.some(o=>o.slot===option.slot&&o.doctor===option.doctor)))throw Error('請重新查詢可用時段');
 const p:Proposal={before:s.intent==='book'?null:a?{...a}:null,id:randomUUID(),session:s.id,revision:s.revision,kind:s.intent as Proposal['kind'],appointmentId:a?.id??null,version:a?.version??0,doctor:option?.doctor??a!.doctor,slot:option?.slot??a!.slot,expires:Date.now()+10*60000};c.proposals[p.id]=p;s.proposal=p.id;recordStep(s,'confirmation','等待患者確認',`${p.doctor} · ${p.slot.replace('T',' ')}。確認卡綁定此會話與預約版本，有效 10 分鐘；尚未寫入預約。`);message(s,'assistant',`請確認：${p.kind==='cancel'?'取消':p.kind==='book'?'新增預約':'改期至'} ${p.doctor}，${p.slot.replace('T',' ')}（台北時間）。\n按下確認後才會生效。`);return p;
}
export function confirm(c:Clinic,id:string,pid:string){const s=getSession(c,id),p=c.proposals[pid];if(!p||p.session!==id)throw Error('無效的確認');if(p.result)return p.result;if(s.handoff||p.expires<Date.now()||p.revision!==s.revision||s.proposal!==pid)throw Error('這份確認已失效，請重新選擇');if(p.kind!=='cancel'&&(!validDate(p.slot.slice(0,10))||Date.parse(p.slot+':00+08:00')<=Date.now()))throw Error('這個時段已過期，請重新選擇');const a=c.appointments.find(a=>a.scope===s.scope&&a.id===p.appointmentId&&a.patient===s.patient&&a.status==='booked');if(p.kind!=='book'&&(!a||a.version!==p.version))throw Error('預約已有更新，請重新查詢');if(p.kind!=='cancel'&&c.appointments.some(a=>a.scope===s.scope&&a.status==='booked'&&a.doctor===p.doctor&&a.slot===p.slot))throw Error('這個時段剛被預約了。原預約仍保留，請改選其他時段。');
 const before=p.kind==='book'?null:a?{...a}:null;let after:Appointment;
 if(p.kind==='book'){after={id:randomUUID(),scope:s.scope,patient:s.patient,doctor:p.doctor,slot:p.slot,version:1,status:'booked'};c.appointments.push(after);}else if(a){a.version++;if(p.kind==='cancel')a.status='cancelled';else {a.doctor=p.doctor;a.slot=p.slot;}}
 after=p.kind==='book'?c.appointments.at(-1)!:a!;s.lastReceipt={kind:p.kind,before,after:{...after},at:new Date().toISOString()};
 p.result=`已${p.kind==='cancel'?'取消預約':p.kind==='book'?'完成預約':'完成改期'}：${p.doctor} · ${p.slot.replace('T',' ')}。這是示範資料，不是真實掛號。`;s.proposal=null;s.options=[];s.intent='unclear';message(s,'assistant',p.result);event(c,id,'committed',p.result);recordStep(s,'storage','預約異動已提交',p.result);return p.result;
}
export function view(c:Clinic,id:string){const s=getSession(c,id);return {session:s,appointments:own(c,s),proposal:s.proposal?c.proposals[s.proposal]:null,patient:patients.find(p=>p.id===s.patient),today:dateInTaipei()};}
