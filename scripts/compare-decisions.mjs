/** Reanalyse frozen synthetic predictions; never call a paid endpoint. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {ruleDecision} from '../app/lib/dental/domain.ts';
const root=new URL('../',import.meta.url);
const raw=fs.readFileSync(new URL('reports/nvidia4b-choice-v2.json',root));
const source=JSON.parse(raw),base=source.baseRaw,trained=source.trainedRaw;
assert.equal(base.predictions.length,64);assert.equal(trained.predictions.length,64);
const cases=trained.predictions.map((p,i)=>{
 const b=base.predictions[i];assert.equal(b.text,p.text);assert.equal(b.expected,p.expected);
 return {text:p.text,expected:p.expected,rule:ruleDecision(p.text,undefined,new Date('2026-10-15T04:00:00Z')).intent,base:b.predicted,tuned:p.predicted,score:p.confidence};
});
const count=key=>cases.filter(p=>p[key]===p.expected).length;
assert.equal(count('base'),base.correct);assert.equal(count('tuned'),trained.correct);
const report={
 generatedAt:new Date().toISOString(),source:'reports/nvidia4b-choice-v2.json',sourceSha256:crypto.createHash('sha256').update(raw).digest('hex'),n:cases.length,
 methodology:'Same frozen 64 single-message, author-written synthetic inputs and labels. Rules executed now; base and tuned predictions reanalysed from the saved CUDA experiment. No new model inference, no paid calls, no clinical or independent validation. Intent classification only; not end-to-end task success.',
 rows:[{id:'rule',label:'Current deterministic rules',correct:count('rule'),accepted:null,acceptedErrors:null},{id:'base',label:'NVIDIA 4B base',correct:count('base'),accepted:base.accepted,acceptedErrors:base.acceptedErrors},{id:'tuned',label:'NVIDIA 4B + LoRA v2',correct:count('tuned'),accepted:trained.accepted,acceptedErrors:trained.acceptedErrors}],
 breakdown:[...new Set(cases.map(c=>c.expected))].map(intent=>({intent,n:cases.filter(c=>c.expected===intent).length,...Object.fromEntries(['rule','base','tuned'].map(key=>[key,cases.filter(c=>c.expected===intent&&c[key]===intent).length]))})),
 cases,limitations:['The rules include handwritten safety overrides, but this comparison does not apply those overrides to the saved model predictions.','All data shares the authoring process. Results do not establish real-world generalisation or a statistically reliable ranking.','Scores are not calibrated correctness probabilities. The 0.85 threshold does not authorize writes.','English equivalence, multi-turn quality, clinic workload reduction and matched end-to-end latency/cost remain unmeasured.']
};
fs.writeFileSync(new URL('app/public/evidence/decision-comparison.json',root),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({n:report.n,rows:report.rows,paidCalls:0,sourceSha256:report.sourceSha256}));
