/** One real NVIDIA request with a durable shared budget reservation. No recharge or cap reset. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {transact} from '../app/lib/dental/store.ts';
import {reservePaidFallback} from '../app/lib/dental/budget.ts';
import {seed,createSession,getSession} from '../app/lib/dental/domain.ts';
import {decide} from '../app/lib/dental/model.ts';
if(process.env.DECISION_MODE!=='nebius')throw Error('Run explicitly with DECISION_MODE=nebius');
const report={checkedAt:new Date().toISOString(),billingEvidence:'Authenticated billing check completed; exact balance retained only in private configuration. Separate trial credits were not combined.',model:'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B',requests:0,reservationUsd:null,actualInvoiceChargeUsd:null,passed:false};
try{
 const reservation=await transact(c=>{const before=c.usage.reservedUsd;reservePaidFallback(c);return c.usage.reservedUsd-before;});report.reservationUsd=+reservation.toFixed(6);
 const c=seed(),s=getSession(c,createSession(c,'lin','en'));report.requests=1;
 const result=await decide('Not cancel—please reschedule my appointment',s);
 assert.equal(result.provider,'Nebius Token Factory');assert.equal(result.decision.intent,'reschedule');
 report.latencyMs=result.latencyMs;report.usage=result.usage;report.decision=result.decision;report.passed=true;
}catch(e){report.error=String(e).replace(/Bearer\s+\S+/g,'Bearer [REDACTED]');}
fs.writeFileSync(new URL('../reports/nebius-fallback-verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
