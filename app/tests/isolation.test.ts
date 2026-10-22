import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed,createSession,getSession,own,available,beginMessage,applyDecision,ruleDecision,propose,confirm} from '../lib/dental/domain.ts';

test('independent visitors can book the same fictional slot without affecting one another',()=>{
 const c=seed(),a=createSession(c,'lin','en',true),b=createSession(c,'lin','en',true);
 const sa=getSession(c,a),sb=getSession(c,b),old=structuredClone(own(c,sb)[0]);
 for(const s of [sa,sb]){beginMessage(c,s.id,'reschedule');applyDecision(c,s,ruleDecision('reschedule',s),'reschedule');}
 assert.deepEqual(sa.options,sb.options);
 const pa=propose(c,sa,sa.options[0]),pb=propose(c,sb,sb.options[0]);
 assert.throws(()=>confirm(c,b,pa.id),/無效/);
 confirm(c,a,pa.id);assert.deepEqual(own(c,sb)[0],old);confirm(c,b,pb.id);
 assert.equal(own(c,sa)[0].slot,own(c,sb)[0].slot);assert.notEqual(own(c,sa)[0].id,own(c,sb)[0].id);
});
test('same-workspace collisions still fail and preserve the original booking',()=>{
 const c=seed(),id=createSession(c,'lin','zh',true),s=getSession(c,id),original=structuredClone(own(c,s)[0]);
 s.intent='reschedule';s.appointmentId=original.id;s.options=available(c,s);const p=propose(c,s,s.options[0]);
 c.appointments.push({id:'collision',scope:s.scope,patient:'wu',doctor:p.doctor,slot:p.slot,status:'booked',version:1});
 assert.throws(()=>confirm(c,id,p.id),/原預約/);assert.deepEqual(own(c,s)[0],original);assert.equal(s.lastReceipt,undefined);
});
test('stored receipt is immutable, survives serialization and replay does not replace it',()=>{
 const c=seed(),id=createSession(c,'lin','en',true),s=getSession(c,id);s.intent='reschedule';s.appointmentId=own(c,s)[0].id;s.options=available(c,s);
 const p=propose(c,s,s.options[0]),old=own(c,s)[0].slot;confirm(c,id,p.id);
 const receipt=structuredClone(s.lastReceipt);confirm(c,id,p.id);assert.deepEqual(s.lastReceipt,receipt);
 assert.equal(receipt!.before!.slot,old);assert.equal(receipt!.after.slot,p.slot);assert.equal(receipt!.after.version,2);
 own(c,s)[0].version++;assert.equal(s.lastReceipt!.after.version,2);
 assert.deepEqual(JSON.parse(JSON.stringify(c)).sessions[id].lastReceipt,receipt);
});
test('legacy shared sessions stay compatible and never see isolated fixtures',()=>{
 const c=seed(),legacy=getSession(c,createSession(c)),isolated=getSession(c,createSession(c,'lin','zh',true));
 assert.equal(own(c,legacy).length,1);assert.equal(own(c,isolated).length,1);assert.notEqual(own(c,legacy)[0].id,own(c,isolated)[0].id);
});

test('new booking and cancellation receipts describe exactly the changed record',()=>{
 const c=seed(),id=createSession(c,'lin','en',true),s=getSession(c,id);
 s.intent='book';s.appointmentId=own(c,s)[0].id;s.options=available(c,s);
 const p=propose(c,s,s.options[0]);assert.equal(p.before,null);confirm(c,id,p.id);
 assert.equal(s.lastReceipt!.before,null);assert.equal(s.lastReceipt!.after.status,'booked');assert.equal(own(c,s).length,2);
 s.intent='cancel';s.appointmentId=s.lastReceipt!.after.id;const cancel=propose(c,s,null);confirm(c,id,cancel.id);
 assert.equal(s.lastReceipt!.before!.status,'booked');assert.equal(s.lastReceipt!.after.status,'cancelled');assert.equal(s.lastReceipt!.after.version,2);assert.equal(own(c,s).length,1);
});
