import {classify,decisionFromChoice,type Choice} from './choice.ts';
import { z } from 'zod';
import { type Session, type Decision, ruleDecision, dateInTaipei } from './domain.ts';
export const decisionSchema=z.object({intent:z.enum(['book','reschedule','cancel','appointment_lookup','admin_faq','human_request','clinical_handoff','unclear']),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),doctor:z.enum(['陳醫師','林醫師']).nullable(),period:z.enum(['morning','afternoon','evening']).nullable(),appointmentId:z.string().nullable(),question:z.string().max(240).nullable()}).strict();
export const MODEL=process.env.NEBIUS_DECISION_MODEL||'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B';
export function mode(){return process.env.DECISION_MODE??'rule';}
export const systemPrompt=`你是台灣牙醫行政客服的決策層。只輸出一個 JSON，不要思考過程或 Markdown。schema: {"intent":"book|reschedule|cancel|appointment_lookup|admin_faq|human_request|clinical_handoff|unclear","date":"YYYY-MM-DD 或 null","doctor":"陳醫師|林醫師 或 null","period":"morning|afternoon|evening 或 null","appointmentId":"已提供的預約 ID 或 null","question":"必要澄清問題 或 null"}。所有欄位必填。不確定不要猜。症狀、診斷、用藥必須 clinical_handoff；找真人為 human_request。「先不要」語意不明，詢問取消或改期；「不是取消，是改」為 reschedule。下班後不等於特定時間，請澄清。日期以 Asia/Taipei 為準，週日休診。這只是分類，不能宣稱完成預約。`;
export type ModelResult={decision:Decision;model:string;provider?:string;latencyMs:number;usage:unknown;choice?:Choice;fallbackReason?:string};
export async function decide(text:string,s:Session,reserveFallback?:()=>Promise<void>,endpoint?:string):Promise<ModelResult>{
 if(mode()==='hybrid'){
  const started=Date.now();let choice:Choice|undefined;let fallbackReason='微調服務暫時無法連線';
  try {choice=await classify(text,endpoint);if(!choice.abstain)return {decision:decisionFromChoice(text,s,choice),model:choice.model+' / '+choice.version,provider:'Mac / MLX · LoRA',latencyMs:Date.now()-started,usage:null,choice};fallbackReason='微調分數低於 0.85，交由 Nebius 再判斷';}catch{/* Failure is attributed in the returned trace; never relabeled as fine-tuned inference. */}
  try{if(!reserveFallback)throw Error('Paid fallback requires an atomic reservation');await reserveFallback();const result=await remoteDecision(text,s);return {...result,choice,fallbackReason};}
  catch(error){if(!choice)throw error;return {decision:decisionFromChoice(text,s,choice),model:choice.model+' / '+choice.version,provider:'Mac / MLX · LoRA',latencyMs:Date.now()-started,usage:null,choice,fallbackReason: fallbackReason+'；後備判斷未完成，先向患者澄清'};}
 }
 return remoteDecision(text,s);
}
async function remoteDecision(text:string,s:Session):Promise<ModelResult>{
 const start=Date.now();if(mode()==='rule')return {decision:ruleDecision(text,s),model:'rule-baseline',latencyMs:Date.now()-start,usage:null};
 const adapter=mode()==='adapter';const key=adapter?process.env.DECISION_ADAPTER_KEY:process.env.NEBIUS_API_KEY;
 if(!key)throw Error('模型金鑰尚未設定');
 if(!adapter&&!['nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B','nvidia/Nemotron-3_5-Lightning'].includes(MODEL))throw Error('模型不在已核定價格清單');
 const response=await fetch(adapter?process.env.DECISION_ADAPTER_URL!: `${process.env.NEBIUS_BASE_URL||'https://api.tokenfactory.nebius.com/v1/'}chat/completions`,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:adapter?(process.env.DECISION_ADAPTER_MODEL||'fine-tuned-nemotron'):MODEL,messages:[{role:'system',content:systemPrompt+(s.locale==='en'?' Any clarification question must be in English.':'')},{role:'user',content:JSON.stringify({today:dateInTaipei(),current:{intent:s.intent,date:s.date,doctor:s.doctor,period:s.period},recent:s.messages.slice(-6).map(m=>({role:m.role,text:m.text})),text})}],temperature:0,max_tokens:400,...(!adapter?{chat_template_kwargs:{enable_thinking:false}}:{}),response_format:{type:'json_object'}}),signal:AbortSignal.timeout(45000)});
 if(!response.ok)throw Error(`模型服務失敗 (${response.status})`);const data=await response.json();const content=data.choices?.[0]?.message?.content;const decision=decisionSchema.parse(JSON.parse(content));return {decision,model:adapter?'fine-tuned-adapter':MODEL,provider:adapter?'Custom adapter':'Nebius Token Factory',latencyMs:Date.now()-start,usage:data.usage??null};
}
