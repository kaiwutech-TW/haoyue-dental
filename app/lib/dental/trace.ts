import {localize,type Locale} from './language.ts';
// Deliberately small, public presentation data. Never put prompts, keys or raw
// provider responses here. A trace belongs to one session and one user turn.
export type TraceStep = {
 id:string; at:string;
 stage:'input'|'model'|'decision'|'validation'|'confirmation'|'storage'|'handoff'|'knowledge';
 title:string; detail:string;
 model?:string; provider?:string; latencyMs?:number; tokens?:number; choices?:Record<string,number>; adapterHash?:string;
};
export function recordStep(s:{trace?:TraceStep[];locale?:Locale},stage:TraceStep['stage'],title:string,detail:string,meta:Partial<Pick<TraceStep,'model'|'provider'|'latencyMs'|'tokens'|'choices'|'adapterHash'>>={}){
 s.trace??=[];
 s.trace.push({id:crypto.randomUUID(),at:new Date().toISOString(),stage,title:localize(title,s.locale),detail:stage==='input'||stage==='decision'?detail:localize(detail,s.locale),...meta});
 s.trace=s.trace.slice(-16);
}
