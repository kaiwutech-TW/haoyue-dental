/** Real browser footage of the deployed app. User authorized Playwright on 2026-10-21.
 * No mocked routes, injected responses, stored login state, or budget resets.
 * Install playwright in the ignored tooling directory described in docs/demo/live/.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('../artifacts/video-live/tooling/node_modules/playwright');
const root=new URL('../',import.meta.url).pathname;
const out=path.join(root,'artifacts/video-live/playwright');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:false});
const context=await browser.newContext({viewport:{width:1600,height:1100},deviceScaleFactor:1,
  recordVideo:{dir:out,size:{width:1600,height:1100}},locale:'en-US'});
const epoch=Date.now();
const page=await context.newPage();
const video=page.video();
const report={startedAt:new Date(epoch).toISOString(),base:'https://haoyue-dental.vercel.app',
  capture:'Playwright native recordVideo; genuine deployed browser, normal elapsed time',
  viewport:{width:1600,height:1100},mockedRequests:0,importedCookies:false,chapters:[],actions:[],responses:[],passed:false};
const now=()=>+( (Date.now()-epoch)/1000).toFixed(3);
const mark=(action,extra={})=>{const item={at:now(),action,...extra};report.actions.push(item);console.log(JSON.stringify(item));};
const wait=ms=>page.waitForTimeout(ms);
async function chapter(id,title,minSeconds,fn){const c={id,title,start:now(),end:null};report.chapters.push(c);mark('chapter:'+id);await fn();
  await wait(Math.max(0,minSeconds*1000-(now()-c.start)*1000));c.end=now();}
async function snap(name){await page.screenshot({path:path.join(out,name+'.png')});}
async function action(label,fn){mark(label);const result=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/clinic'&&r.request().method()==='POST');await fn();
  const r=await result;const j=await r.json();if(!r.ok())throw Error(label+': '+j.error);const d=j.data;
  report.responses.push({at:now(),action:label,ok:true,region:j.serverRegion,storage:j.storage,
    locale:d.session.locale,appointments:d.appointments.map(a=>({slot:a.slot,version:a.version})),
    proposal:d.proposal?{slot:d.proposal.slot,version:d.proposal.version}:null,
    handoff:d.session.handoff,trace:(d.session.trace??[]).map(t=>({stage:t.stage,title:t.title,provider:t.provider,
      model:t.model,latencyMs:t.latencyMs,choices:t.choices,adapterHash:t.adapterHash}))});
  return d;}
async function send(label,text){const input=page.getByRole('textbox',{name:report.language==='zh'?'輸入訊息':'Type your message',exact:true});
  await input.click();mark('type:'+label);await input.pressSequentially(text,{delay:48});await wait(1100);
  return action(label,()=>input.press('Enter'));}
let original,proposal,committed;
try{
  await page.goto(report.base+'/en',{waitUntil:'networkidle'});
  report.readyAt=now();report.language='en';
  await page.getByRole('button',{name:/Claire Lin See demo/}).waitFor();
  await chapter('01-intro','Real deployed app on the demonstration Mac',16.8,async()=>{
    await wait(2500);const d=await action('choose-fictional-patient',()=>page.getByRole('button',{name:/Claire Lin See demo/}).click());
    original=d.appointments[0];if(!original)throw Error('No original synthetic booking');await snap('01-start');});
  await chapter('02-intent','Free text reaches the fine-tuned NVIDIA model',16.8,async()=>{
    const d=await send('English-correction','Not cancel, please reschedule my appointment');
    const choice=d.session.trace.find(t=>t.choices);
    if(!choice||!choice.model.includes('NVIDIA-Nemotron-3-Nano-4B'))throw Error('No genuine NVIDIA 4B evidence');
    if(d.session.intent!=='reschedule'||!d.session.options.length)throw Error('Correction did not produce slots');
    if(d.appointments[0].version!==original.version)throw Error('Booking changed before confirmation');await snap('02-intent');});
  await chapter('03-confirm','Review, repeat, confirm, then stored readback',24,async()=>{
    await wait(1600);proposal=await action('select-slot',()=>page.locator('.slot-grid button').first().click());
    if(!proposal.proposal||proposal.appointments[0].version!==original.version)throw Error('Original booking not preserved');
    await snap('03-proposal');await wait(2500);
    const repeated=await send('repeat-identical-request','Not cancel, please reschedule my appointment');
    if(repeated.proposal.id!==proposal.proposal.id||repeated.session.trace.some(t=>t.model))throw Error('Repeat re-ran inference or lost proposal');
    await snap('04-repeat');await wait(2800);
    committed=await action('explicit-confirm',()=>page.getByRole('button',{name:'Confirm reschedule',exact:true}).click());
    if(committed.appointments[0].version!==original.version+1||committed.appointments[0].slot!==proposal.proposal.slot)throw Error('Saved booking mismatch');
    await snap('05-committed');});
  await chapter('04-patience','Patient guidance uses transparent rules',11,async()=>{
    await wait(1500);const d=await action('explicit-confusion',()=>page.getByRole('button',{name:'Need a little help ↗',exact:true}).click());
    if(d.session.trace.some(t=>t.model))throw Error('Guidance unexpectedly used a model');await snap('06-guidance');});
  await chapter('05-handoff','Open a human case without a fabricated staff reply',8,async()=>{
    await wait(1000);const d=await action('human-handoff',()=>page.getByRole('button',{name:'Human help',exact:true}).click());
    if(!d.session.handoff||d.appointments[0].version!==committed.appointments[0].version)throw Error('Handoff changed booking');
    if(!d.session.messages.at(-1).text.includes('No staff member has replied yet'))throw Error('Missing handoff caveat');await snap('07-handoff');});
  await chapter('06-stack','Implementation and sponsor roles',18,async()=>{
    await page.getByRole('link',{name:'Problem & technology ↓',exact:true}).click();
    await wait(1800);await page.getByText('Evidence, honest limits and reproducibility',{exact:true}).click();await snap('08-stack');});
  await chapter('07-evidence','Synthetic evaluation and latency limitations',24,async()=>{
    await page.getByText('Evidence, honest limits and reproducibility',{exact:true}).scrollIntoViewIfNeeded();
    await snap('09-evidence');});
  await chapter('08-close','Mandarin input; English equivalence remains unproven',23,async()=>{
    mark('switch-to-Mandarin');await page.getByRole('link',{name:'繁體中文 ↗',exact:true}).click();report.language='zh';
    await page.getByRole('button',{name:/林小晴 查看示範預約/}).waitFor();
    await action('choose-Mandarin-patient',()=>page.getByRole('button',{name:/林小晴 查看示範預約/}).click());
    const d=await send('Mandarin-correction','不是取消，是想改時間');
    if(d.session.intent!=='reschedule'||!d.session.trace.some(t=>t.choices))throw Error('No actual Mandarin NVIDIA result');await snap('10-Mandarin');});
  report.passed=true;report.completedAt=new Date().toISOString();mark('recording-complete');
}catch(e){report.error=String(e);console.error(report.error);}
finally{
  report.pageCloseAt=now();await context.close();await video.saveAs(path.join(out,'haoyue-live-raw.webm'));await browser.close();
  report.totalElapsedSeconds=now();await fs.writeFile(path.join(out,'recording.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:report.passed,seconds:report.totalElapsedSeconds,chapters:report.chapters.length,error:report.error}));
  if(!report.passed)process.exitCode=1;
}
