/** Read-only operational check. Run with node --env-file=.env. Never refresh a balance timestamp here. */
import fs from 'node:fs';
import {read} from '../app/lib/dental/store.ts';
import {reservePaidFallback} from '../app/lib/dental/budget.ts';
import {localize} from '../app/lib/dental/language.ts';
const report={checkedAt:new Date().toISOString(),database:false,inference:false,inferenceAdapterMatches:false,fallback:{ready:false,reason:'Not checked'},paidCalls:0,mutations:0};
try{
 const state=await read(c=>({endpoint:c.inferenceEndpoint,state:structuredClone(c)}));report.database=true;
 try{reservePaidFallback(state.state);report.fallback={ready:true,reason:'Reservation would be allowed; no reservation committed and no API call made'};}catch(e){report.fallback={ready:false,reason:localize(e.message,'en')};}
 const endpoint=state.endpoint??process.env.DECISION_ADAPTER_URL;
 if(endpoint&&process.env.DECISION_ADAPTER_KEY){
  const u=new URL(endpoint);if(state.endpoint&&!/^https:\/\/[a-z0-9-]+\.trycloudflare\.com\/decision$/.test(endpoint))throw Error('Registered inference URL rejected');
  u.pathname='/health';u.search='';
  const response=await fetch(u,{headers:{authorization:`Bearer ${process.env.DECISION_ADAPTER_KEY}`},signal:AbortSignal.timeout(10000)});
  if(response.ok){const body=await response.json();report.inference=true;report.inferenceAdapterMatches=JSON.stringify(body).includes('4940141c0e05473b3cc1bb77ea8ab341deb6183c1a6dcc4039136c8ab0fac857');}
 }
}catch{report.error='A required data or inference service could not be reached. Inspect private service logs.';}
report.coreReady=report.database&&report.inference&&report.inferenceAdapterMatches;
if(process.env.REPORT_PATH)fs.writeFileSync(process.env.REPORT_PATH,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));if(!report.coreReady)process.exitCode=1;
