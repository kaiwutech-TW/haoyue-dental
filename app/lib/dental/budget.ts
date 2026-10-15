import {createHmac} from 'node:crypto';
import {type Clinic,dateInTaipei} from './domain.ts';
export class LimitError extends Error {status=429;}
type Bucket={count:number;until:number};
type Guard={buckets:Record<string,Bucket>;sessions:Record<string,number>;daily:{day:string;reservedUsd:number};paused:boolean};
function guard(c:Clinic,now:number):Guard {c.guard??={buckets:{},sessions:{},daily:{day:dateInTaipei(new Date(now)),reservedUsd:0},paused:false};const g=c.guard;for(const [k,b] of Object.entries(g.buckets))if(b.until<=now)delete g.buckets[k];const day=dateInTaipei(new Date(now));if(g.daily.day!==day)g.daily={day,reservedUsd:0};return g;}
function check(g:Guard,key:string,max:number){if((g.buckets[key]?.count??0)>=max)throw new LimitError('示範使用次數已達上限，請稍後再試。');}
function add(g:Guard,key:string,ttl:number,now:number){const b=g.buckets[key];g.buckets[key]={count:(b?.count??0)+1,until:b?.until??now+ttl};}
export function sourceId(req:Request){
 const secret=process.env.CLINIC_STORE_SECRET;if(process.env.NODE_ENV==='production'&&!secret)throw new LimitError('示範暫停');
 // Vercel overwrites this header. Outside Vercel use a shared bucket, not client-supplied IPs.
 const ip=process.env.VERCEL==='1'?(req.headers.get('x-forwarded-for')??'unknown'):'local';
 return createHmac('sha256',secret??'local-only').update(ip).digest('hex').slice(0,32);
}
export function admitRequest(c:Clinic,source:string,action:string,now=Date.now()){
 const g=guard(c,now);check(g,'request:'+source,30);if(action==='start')check(g,'start:'+source,5);
 if(Object.keys(g.buckets).length>10000)throw new LimitError('示範容量已滿，請稍後再試。');
 add(g,'request:'+source,60000,now);if(action==='start')add(g,'start:'+source,3600000,now);
}
function paidReservation(c:Clinic,env:Record<string,string|undefined>,now:number){
 const g=guard(c,now);if(g.paused||env.MODEL_CALLS_ENABLED==='false')throw new LimitError('AI 示範已暫停。');
 const allowance=Number(env.MODEL_SPEND_CAP_USD??'1'),balance=Number(env.VERIFIED_NEBIUS_BALANCE_USD??'0'),cost=Number(env.MODEL_CALL_RESERVE_USD??'.02'),daily=Number(env.MODEL_DAILY_CAP_USD??'.40'),verified=Date.parse(env.BALANCE_VERIFIED_AT??'');
 if(![allowance,balance,cost,daily,verified].every(Number.isFinite)||cost<.02||allowance<0||daily<0||verified>now||now-verified>86400000)throw new LimitError('AI 示範暫停，等待管理員確認額度。');
 if(c.usage.reservedUsd+cost>Math.min(allowance,balance-5)+1e-9||g.daily.reservedUsd+cost>daily+1e-9)throw new LimitError('今日 AI 示範額度已達上限，預約資料仍保留。');
 return {g,cost};
}
export function reservePaidFallback(c:Clinic,env:Record<string,string|undefined>=process.env,now=Date.now()){
 const {g,cost}=paidReservation(c,env,now);
 g.daily.reservedUsd=Math.round((g.daily.reservedUsd+cost)*1e6)/1e6;
 c.usage.reservedUsd=Math.round((c.usage.reservedUsd+cost)*1e6)/1e6;
}
export function reserveModel(c:Clinic,id:string,source:string,env:Record<string,string|undefined>=process.env,now=Date.now(),paid=true){
 const g=guard(c,now);if(g.paused||env.MODEL_CALLS_ENABLED==='false')throw new LimitError('AI 示範已暫停。');
 if((g.sessions[id]??0)>=10)throw new LimitError('此對話已達 AI 體驗次數上限。');
 check(g,'model-minute:'+source,3);check(g,'model-day:'+source,10);
 if(paid)reservePaidFallback(c,env,now);
 add(g,'model-minute:'+source,60000,now);add(g,'model-day:'+source,86400000,now);
 g.sessions[id]=(g.sessions[id]??0)+1;c.usage.calls++;
}
export function pauseModels(c:Clinic){guard(c,Date.now()).paused=true;}
