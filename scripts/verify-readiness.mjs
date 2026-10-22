/** Isolated Playwright contexts; genuine API flow. Optional local fault injection is reported separately. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('../artifacts/video-live/tooling/node_modules/playwright');
const AxeBuilder=require('../artifacts/video-live/tooling/node_modules/@axe-core/playwright').default;
const base=process.env.TEST_URL??'http://127.0.0.1:3010';
const faults=process.env.FAULTS==='1';
if(faults&&!/^http:\/\/(127\.0\.0\.1|localhost):/.test(base))throw Error('Fault injection is limited to local verification');
const out=new URL('../artifacts/private/readiness/',import.meta.url);await fs.mkdir(out,{recursive:true});
const report={checkedAt:new Date().toISOString(),base,passed:false,realFlow:[],faultInjection:[],accessibility:[],timings:[],pageErrors:[]};
const browser=await chromium.launch({channel:'chrome',headless:true});
async function make(locale='en',viewport={width:1440,height:1100}){
 const context=await browser.newContext({viewport,locale:'en-US',reducedMotion:'reduce'});const page=await context.newPage();
 page.on('pageerror',e=>report.pageErrors.push(e.message));
 const url=base+(locale==='en'?'/en':'/');await page.goto(url,{waitUntil:'networkidle'});
 await page.getByRole('button',{name:locale==='en'?/Claire Lin See demo/:/林小晴 查看示範預約/}).waitFor();return {context,page,locale};
}
async function uiAction(p,label,fn){const start=performance.now();const response=p.page.waitForResponse(r=>new URL(r.url()).pathname==='/api/clinic'&&r.request().method()==='POST');await fn();const r=await response;const j=await r.json();assert.equal(r.ok(),true,label+': '+j.error);await p.page.waitForFunction(()=>!document.querySelector('.typing')&&!document.querySelector('.scenario-picker button')?.disabled);report.timings.push({action:label,ms:Math.round(performance.now()-start),traceModels:(j.data.session.trace??[]).filter(t=>t.model).map(t=>({provider:t.provider,model:t.model,forwardMs:t.choices?t.latencyMs:undefined}))});return j.data;}
async function start(p){return uiAction(p,'start-'+p.locale,()=>p.page.getByRole('button',{name:p.locale==='en'?/Claire Lin See demo/:/林小晴 查看示範預約/}).click());}
async function send(p,text){await p.page.getByRole('textbox',{name:p.locale==='en'?'Type your message':'輸入訊息',exact:true}).fill(text);return uiAction(p,'message-'+p.locale,()=>p.page.getByRole('button',{name:p.locale==='en'?'Send message':'送出訊息',exact:true}).click());}
async function saved(p){const r=await p.context.request.get(base+'/api/clinic?locale='+p.locale);assert.equal(r.ok(),true);return (await r.json()).data;}
async function api(p,body){const r=await p.context.request.post(base+'/api/clinic?locale='+p.locale,{data:body});return {ok:r.ok(),status:r.status(),body:await r.json()};}
async function audit(p,name){const result=await new AxeBuilder({page:p.page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();report.accessibility.push({name,violations:result.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});assert.equal(await p.page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,name+' horizontal overflow');await p.page.screenshot({path:new URL(name+'.png',out).pathname});}
try{
 const a=await make(),b=await make();
 await a.page.keyboard.press('Tab');assert.equal(await a.page.locator(':focus').textContent(),'Skip to booking demo');await a.page.keyboard.press('Enter');assert.equal(await a.page.locator(':focus').getAttribute('id'),'patient-demo');await audit(a,'desktop-welcome');report.realFlow.push('Keyboard skip link reaches the focusable booking demo');
 const sa=await start(a),sb=await start(b);assert.notEqual(sa.session.scope,sb.session.scope);assert.ok(sa.session.scope);assert.equal(sa.appointments[0].version,1);assert.equal(sb.appointments[0].version,1);
 const text='Not cancel—please reschedule my appointment';const da=await send(a,text),db=await send(b,text);
 assert.ok(da.session.options.length);assert.ok(db.session.options.length);
 if(process.env.EXPECT_CHOICE==='1')for(const d of [da,db])assert.ok(d.session.trace.some(t=>t.choices&&t.adapterHash==='4940141c0e05473b3cc1bb77ea8ab341deb6183c1a6dcc4039136c8ab0fac857'),'Expected actual NVIDIA adapter');
 const pa=await uiAction(a,'select',()=>a.page.locator('.slot-grid button').first().click());
 await a.page.getByText('NOT SAVED',{exact:true}).waitFor();assert.equal(pa.appointments[0].version,1);assert.equal(pa.proposal.before.slot,sa.appointments[0].slot);
 await audit(a,'desktop-confirmation');
 const done=await uiAction(a,'confirm',()=>a.page.getByRole('button',{name:'Confirm reschedule',exact:true}).click());
 assert.equal(done.appointments[0].version,2);assert.equal(done.session.lastReceipt.before.slot,sa.appointments[0].slot);assert.equal(done.session.lastReceipt.after.slot,pa.proposal.slot);
 const replay=await api(a,{action:'confirm',proposalId:pa.proposal.id});assert.ok(replay.ok);assert.equal(replay.body.data.appointments[0].version,2);
 assert.equal((await saved(b)).appointments[0].version,1);assert.equal((await saved(b)).session.messages.some(m=>m.text===done.session.messages.at(-1).text),false);
 await a.page.reload({waitUntil:'networkidle'});await a.page.locator('.runtime-panel').getByText('Latest saved change',{exact:true}).waitFor();assert.equal((await saved(a)).session.lastReceipt.after.version,2);
 const pb=await uiAction(b,'select-independent-same-slot',()=>b.page.locator('.slot-grid button').first().click());assert.equal(pb.proposal.slot,pa.proposal.slot);
 await uiAction(b,'confirm-independent-same-slot',()=>b.page.getByRole('button',{name:'Confirm reschedule',exact:true}).click());assert.equal((await saved(b)).appointments[0].version,2);
 report.realFlow.push('Two independent browser visitors can confirm the same fictional slot; no cross-visitor booking or message change','Confirmation before write; original snapshot; idempotent replay; stored receipt survives reload');
 await audit(a,'desktop-saved');await a.page.locator('.technical-details > summary').click();await a.page.locator('.evaluation-evidence details > summary').click();await audit(a,'desktop-expanded-evidence');
 const handoff=await send(b,'Talk to staff');assert.equal(handoff.session.handoff,true);assert.equal(handoff.appointments[0].version,2);assert.equal(handoff.session.messages.at(-1).role,'assistant');assert.ok(handoff.session.messages.at(-1).text.includes('No staff member has replied yet'));report.realFlow.push('Human handoff preserves booking and does not impersonate staff');
 if(faults){
  await b.page.route('**/api/clinic?locale=en',async route=>{if(route.request().method()==='GET')await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'The data service is temporarily unavailable. Please retry.'})});else await route.continue();});
  await b.page.reload({waitUntil:'networkidle'});await b.page.locator('.error[role=alert]').waitFor();await b.page.unroute('**/api/clinic?locale=en');await b.page.getByRole('button',{name:'Read saved appointments',exact:true}).click();await b.page.locator('.runtime-panel').getByText('Latest saved change',{exact:true}).waitFor();report.faultInjection.push('Injected GET 503 is visible and read-only retry restores persisted state');
  const c=await make('zh',{width:390,height:844});await start(c);const dc=await send(c,'不是取消，是想改時間');assert.ok(dc.session.options.length);const pc=await uiAction(c,'select-zh',()=>c.page.locator('.slot-grid button').first().click());await audit(c,'mobile-confirmation-zh');
  await c.page.route('**/api/clinic?locale=zh',async route=>{if(route.request().method()==='POST'&&JSON.parse(route.request().postData()).action==='confirm'){const response=await route.fetch();assert.ok(response.ok());await route.abort('failed');}else await route.continue();});
  await c.page.getByRole('button',{name:'確認改期',exact:true}).click();await c.page.locator('.error[role=alert]').waitFor();await c.page.locator('.runtime-panel').getByText('最近一次已儲存異動',{exact:true}).waitFor();assert.equal((await saved(c)).appointments[0].version,2);assert.equal((await saved(c)).session.lastReceipt.after.slot,pc.proposal.slot);await c.page.unroute('**/api/clinic?locale=zh');report.faultInjection.push('Real confirmation committed, then response dropped: client re-reads persisted receipt instead of declaring failure or retrying a write');
  await c.page.getByRole('button',{name:'重新讀取已儲存預約',exact:true}).click();await c.page.locator('.error[role=alert]').waitFor({state:'hidden'});await audit(c,'mobile-saved-zh');
  const stale=await send(a,'Please reschedule to a different time');assert.ok(stale.session.options.length);const pending=await uiAction(a,'select-for-stale-check',()=>a.page.locator('.slot-grid button').first().click());
  await send(a,'I clicked by mistake. I don’t know how to use this');const denied=await api(a,{action:'confirm',proposalId:pending.proposal.id});assert.equal(denied.status,400);assert.equal((await saved(a)).appointments[0].version,2);report.realFlow.push('A new message invalidates an uncommitted confirmation without changing the stored booking');
  await a.page.route('**/api/clinic?locale=en',async route=>{if(route.request().method()==='POST'){await new Promise(r=>setTimeout(r,9200));}await route.continue();});
  const slow=send(a,'Check my appointment');await a.page.getByText('Still awaiting the backend. Please do not resend.',{exact:false}).waitFor();await slow;await a.page.unroute('**/api/clinic?locale=en');report.faultInjection.push('Injected slow request shows elapsed waiting and prevents duplicate send');
 }
 await a.page.setViewportSize({width:390,height:844});await audit(a,'mobile-saved-en');
 assert.equal(report.pageErrors.length,0,'Unhandled browser errors');
 assert.equal(report.accessibility.reduce((n,a)=>n+a.violations.length,0),0,'WCAG A/AA accessibility violations');report.passed=true;
}catch(e){report.error=String(e);console.error(report.error);}finally{await browser.close();await fs.writeFile(new URL('verification.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;}
