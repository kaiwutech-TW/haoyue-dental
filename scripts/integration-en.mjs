import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const base=process.env.TEST_URL??'http://localhost:3000';let cookie='',choice;const started=Date.now();
async function post(body){const r=await fetch(base+'/api/clinic?locale=en',{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify(body)});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const j=await r.json();assert.equal(r.ok,true,j.error);if(process.env.EXPECTED_REGION)assert.equal(j.serverRegion,process.env.EXPECTED_REGION);return j.data;}
let d=await post({action:'start',patient:'lin',locale:'en'});assert.equal(d.session.locale,'en');assert.ok(d.session.messages[0].text.startsWith('Hello'));
d=await post({action:'message',text:'I clicked by mistake. I don’t know how to use this'});assert.ok(d.session.messages.at(-1).text.startsWith('No problem'));assert.ok(!d.session.trace.some(t=>t.model));
const original=d.appointments[0];
d=await post({action:'message',text:'Not cancel—please reschedule my appointment'});assert.ok(d.session.options.length);choice=d.session.trace.find(t=>t.choices);if(process.env.EXPECT_CHOICE==='1')assert.ok(choice,'Expected actual NVIDIA LoRA inference');assert.equal(d.appointments[0].version,original.version);
d=await post({action:'select',...d.session.options[0]});const proposal=d.proposal;assert.ok(proposal);assert.ok(d.session.messages.at(-1).text.startsWith('Please confirm rescheduling'));
d=await post({action:'message',text:'Not cancel—please reschedule my appointment'});assert.equal(d.proposal.id,proposal.id);assert.ok(!d.session.trace.some(t=>t.model));assert.ok(d.session.messages.at(-1).text.includes('don’t need to click repeatedly'));
d=await post({action:'confirm',proposalId:proposal.id});assert.equal(d.appointments[0].version,original.version+1);assert.ok(d.session.messages.at(-1).text.startsWith('Appointment rescheduled'));
d=await post({action:'confirm',proposalId:proposal.id});assert.equal(d.appointments[0].version,original.version+1);
d=await post({action:'message',text:'Talk to staff'});assert.ok(d.session.handoff);assert.ok(d.session.messages.at(-1).text.includes('No staff member has replied yet'));
const r=await fetch(base+'/api/desk',{method:'POST',headers:{authorization:`Bearer ${process.env.DEMO_ADMIN_TOKEN}`,'content-type':'application/json'},body:JSON.stringify({action:'reply',sessionId:d.session.id,text:'Hello, the demo front desk has received your message.'})});assert.equal(r.status,200);
const read=await(await fetch(base+'/api/clinic?locale=en',{headers:{cookie}})).json();assert.equal(read.data.session.messages.at(-1).role,'staff');
const other=await(await fetch(base+'/api/clinic?locale=zh',{headers:{cookie}})).json();assert.equal(other.data,null,'English cookie must not select a Chinese session');
const result={checkedAt:new Date().toISOString(),base,passed:true,elapsedMs:Date.now()-started,checks:['English free text','guided mistaken click without model','actual adapter decision','confirmation before write','repeat preserves proposal without model','idempotent commit','English human handoff','staff reply readback','locale cookie isolation'],choice:choice?{model:choice.model,adapterHash:choice.adapterHash,forwardMs:choice.latencyMs}:null};
if(process.env.REPORT_PATH)writeFileSync(process.env.REPORT_PATH,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
