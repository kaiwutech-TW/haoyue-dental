import {z} from 'zod';
import {ruleDecision,type Decision,type Session} from './domain.ts';
const intents=['book','reschedule','cancel','appointment_lookup','admin_faq','human_request','clinical_handoff','unclear'] as const;
export const choiceSchema=z.object({intent:z.enum(intents),confidence:z.number().min(0).max(1),probabilities:z.object(Object.fromEntries(intents.map(k=>[k,z.number().min(0).max(1)])) as Record<typeof intents[number],z.ZodNumber>).strict(),abstain:z.boolean(),latencyMs:z.number().nonnegative(),inputTokens:z.number().int().positive().max(512),model:z.literal('nvidia/NVIDIA-Nemotron-3-Nano-4B-BF16'),version:z.literal('haoyue-choice-v2'),adapterSha256:z.literal('4940141c0e05473b3cc1bb77ea8ab341deb6183c1a6dcc4039136c8ab0fac857'),runtime:z.literal('MLX / Apple silicon')}).strict().refine(c=>Math.abs(Object.values(c.probabilities).reduce((a,b)=>a+b,0)-1)<.001&&Math.abs(c.probabilities[c.intent]-c.confidence)<.001&&Object.values(c.probabilities).every(p=>p<=c.confidence+.001)&&c.abstain===(c.confidence<.85),'Inconsistent choice scores');
export type Choice=z.infer<typeof choiceSchema>;
export function decisionFromChoice(text:string,s:Session,c:Choice):Decision {
 const slots=ruleDecision(text,s);
 // Date/doctor/period parsing is deterministic application code, not trained slot extraction.
 if(c.abstain)return {intent:'unclear',date:null,doctor:null,period:null,appointmentId:null,question:'我想再確認一下，您是要預約、改期、取消，還是查詢原本的時間呢？原預約會先保留。'};
 return {...slots,intent:c.intent,appointmentId:null,question:slots.question};
}
export async function classify(text:string,endpoint?:string):Promise<Choice>{
 const key=process.env.DECISION_ADAPTER_KEY,url=endpoint??process.env.DECISION_ADAPTER_URL;
 if(!key||!url)throw Error('Decision endpoint not configured');
 if(endpoint&&!/^https:\/\/[a-z0-9-]+\.trycloudflare\.com\/decision$/.test(endpoint))throw Error('Invalid registered decision endpoint');
 const r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({text}),signal:AbortSignal.timeout(4000)});
 if(!r.ok)throw Error(`Decision endpoint unavailable (${r.status})`);
 return choiceSchema.parse(await r.json());
}
