import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('Repeated messages preserve the pending proposal and skip paid and local model calls',async()=>{
 process.env.CLINIC_DB_PATH=join(mkdtempSync(join(tmpdir(),'haoyue-guidance-')),'clinic.sqlite');
 delete process.env.SUPABASE_URL;process.env.DECISION_MODE='rule';
 const {transact,read}=await import('../lib/dental/store.ts');
 const {createSession,propose,confirm}=await import('../lib/dental/domain.ts');
 const {chat}=await import('../lib/dental/service.ts');
 const id=await transact(c=>createSession(c,'lin','en'));
 let v=await chat(id,'Please reschedule my appointment','test');assert.ok(v.session.options.length);
 const p=await transact(c=>propose(c,c.sessions[id],c.sessions[id].options[0]));
 const calls=await read(c=>c.usage.calls);
 v=await chat(id,'Please reschedule my appointment','test');assert.equal(v.proposal?.id,p.id);assert.ok(v.session.trace?.some(t=>t.title==='Repeated request: no additional inference'));assert.equal(await read(c=>c.usage.calls),calls);
 await transact(c=>confirm(c,id,p.id));assert.equal(await read(c=>c.appointments[0].version),2);
 const other=await transact(c=>createSession(c,'wu','en'));v=await chat(other,'I clicked by mistake. I don’t know how to use this','test');assert.equal(v.session.support,'step_by_step');assert.ok(v.session.messages.at(-1)?.text.startsWith('No problem'));assert.equal(await read(c=>c.usage.calls),calls);
});
