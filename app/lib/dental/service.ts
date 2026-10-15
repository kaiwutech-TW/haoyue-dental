import {guide,repeated} from './support.ts';
import {recordStep} from './trace.ts';
import {transact,read} from './store.ts';
import {message,beginMessage,applyDecision,handoff,getSession,event,view,ruleDecision,type Clinic,type Session} from './domain.ts';
import {reserveModel,reservePaidFallback,LimitError} from './budget.ts';
import {decide,mode} from './model.ts';
const locks=new Map<string,Promise<unknown>>();
export async function chat(id:string,text:string,source:string){const prior=locks.get(id)??Promise.resolve();const job=prior.catch(()=>{}).then(()=>run(id,text,source));locks.set(id,job);try{return await job;}finally{if(locks.get(id)===job)locks.delete(id);}}
async function run(id:string,text:string,source:string){
 const input=await transact(c=>{const current=getSession(c,id);if(current.messages.filter(m=>m.role==='user'&&Date.now()-Date.parse(m.at)<60000).length>=6)throw Error('請稍候再傳送訊息');
  if(!current.handoff&&repeated(current,text)){current.trace=[];message(current,'user',text);current.support='step_by_step';recordStep(current,'validation','重複需求，免再次推論','僅依文字明確線索調整說明方式，不判定年齡、人格或真實情緒。',{provider:'Rule engine'});message(current,'assistant','已收到同樣的需求，先保留畫面上的選項。慢慢選一個時段，或直接輸入想調整的地方即可；不需要重複點擊。');return {s:structuredClone(current),skip:true};}
  const s=beginMessage(c,id,text);guide(s,text);
  const safe=ruleDecision(text,s);const help=s.support==='step_by_step'&&safe.intent==='unclear';
  if(help&&!s.handoff){recordStep(s,'validation','耐心引導','僅依文字明確線索調整說明方式，不判定年齡、人格或真實情緒。',{provider:'Rule engine'});message(s,'assistant','沒關係，不需要一直點按鈕。您可以直接輸入「我要預約」或「查詢預約」，也可以選「找真人」。確認前不會更動預約。');}
  return {s:structuredClone(s),skip:help&&!s.handoff,endpoint:c.inferenceEndpoint};});
 const s=input.s;if(input.skip)return readView(id);
 if(s.handoff)return transact(c=>{recordStep(getSession(c,id),'handoff','訊息已送入交接案件','等待真人櫃台回覆；本次沒有呼叫模型。');return view(c,id);});
 // A conservative safety gate precedes the model; it cannot authorize a write.
 const safety=ruleDecision(text,s);if(['clinical_handoff','human_request'].includes(safety.intent))return transact(c=>{const current=getSession(c,id);if(current.revision===s.revision){recordStep(current,'model','規則護欄直接轉接','命中醫療／真人／家人代辦規則，本次沒有呼叫 NVIDIA 模型。',{provider:'Rule engine',model:'safety-rules'});applyDecision(c,current,safety,text);}return view(c,id);});
 try{
  if(mode()!=='rule')await transact(c=>reserveModel(c,id,source,process.env,Date.now(),mode()!=='hybrid'));
  const result=await decide(text,s,async()=>{await transact(c=>reservePaidFallback(c));},input.endpoint);
  return transact(c=>{const current=getSession(c,id);if(current.revision!==s.revision)return view(c,id);const usage=result.usage as {total_tokens?:unknown}|null;if(result.choice)recordStep(current,'model','NVIDIA 微調八選一判斷',result.choice.abstain?'分數未達 0.85，暫不採用；分數不是正確率。':'單次前向完成意圖分類；日期與醫師由程式解析，異動仍須患者確認。',{model:result.choice.model+' / '+result.choice.version,provider:'Mac / MLX · LoRA',latencyMs:result.choice.latencyMs,choices:result.choice.probabilities,adapterHash:result.choice.adapterSha256});if(result.fallbackReason)recordStep(current,'model','後備判斷路由',result.fallbackReason);recordStep(current,'model',result.model==='rule-baseline'?'規則判斷完成':'模型判斷完成','已取得回應並通過決策資料格式驗證。',{model:result.model,provider:result.provider??(result.model==='rule-baseline'?'Rule engine':'Nebius Token Factory'),latencyMs:result.latencyMs,...(typeof usage?.total_tokens==='number'&&Number.isFinite(usage.total_tokens)?{tokens:usage.total_tokens}:{})});applyDecision(c,current,result.decision,text);event(c,id,'model',JSON.stringify({model:result.model,latencyMs:result.latencyMs,usage:result.usage}));return view(c,id);});
 }catch(error){return transact(c=>{const current=getSession(c,id);if(current.revision===s.revision){recordStep(current,'model',error instanceof LimitError?'模型額度護欄生效':'模型服務未完成判斷',error instanceof LimitError?'本次未發出模型請求，改交真人處理。':'未取得可採用的有效決策，不把錯誤回應當作成功。');handoff(c,current,error instanceof LimitError?error.message:'目前無法可靠完成自動判斷，已保留您的預約。');}return view(c,id);});}
}
export function staffReply(c:Clinic,id:string,text:string){const s=getSession(c,id);if(!s.handoff)throw Error('此案件尚未交接');s.messages.push({id:crypto.randomUUID(),role:'staff',text,at:new Date().toISOString()});event(c,id,'staff_reply',text);recordStep(s,'handoff','真人櫃台已回覆','回覆已送達這個患者會話，沒有使用模型生成。');}
export function publicDesk(c:Clinic){return {sessions:Object.values(c.sessions).filter(s=>s.handoff).map(s=>({id:s.id,patient:s.patient,messages:s.messages,handoff:s.handoff})),appointments:c.appointments,events:c.events.slice(-60).reverse(),knowledge:c.knowledge,usage:c.usage,modelPaused:c.guard?.paused??false};}

async function readView(id:string){return read(c=>view(c,id));}
