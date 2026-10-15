import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed,createSession,getSession,beginMessage,applyDecision,ruleDecision,propose,confirm,own} from '../lib/dental/domain.ts';
import {localize} from '../lib/dental/language.ts';
import {supportCue,repeated} from '../lib/dental/support.ts';
const chinese=/[\u3400-\u9fff]/;
test('English free text creates English proposal and confirmation, preserving atomic semantics',()=>{
 const c=seed(),id=createSession(c,'lin','en'),s=getSession(c,id);
 const text='Not cancel—please reschedule my appointment';beginMessage(c,id,text);applyDecision(c,s,ruleDecision(text,s),text);
 assert.equal(s.intent,'reschedule');assert.equal(own(c,s)[0].version,1);
 const p=propose(c,s,s.options[0]);confirm(c,id,p.id);confirm(c,id,p.id);
 assert.equal(own(c,s)[0].version,2);assert.ok(s.messages.at(-1)?.text.startsWith('Appointment rescheduled:'));
 for(const m of s.messages)if(m.role==='assistant')assert.equal(chinese.test(m.text),false,m.text);
 for(const trace of s.trace??[])if(trace.stage!=='decision')assert.equal(chinese.test(trace.title+' '+trace.detail),false,trace.detail);
});
test('English safety, clinic information and slot parsing cover unbuttoned input',()=>{
 const c=seed(),id=createSession(c,'lin','en'),s=getSession(c,id);
 for(const text of ['What are your opening hours?','What is the address?','What are the fees?']){applyDecision(c,s,ruleDecision(text,s),text);assert.equal(chinese.test(s.messages.at(-1)!.text),false);}
 const d=ruleDecision('Please reschedule tomorrow afternoon with Dr. Chen',s);assert.equal(d.doctor,'陳醫師');assert.equal(d.period,'afternoon');assert.ok(d.date);
 assert.equal(ruleDecision('Please cancel my mother’s appointment').intent,'human_request');
 assert.equal(ruleDecision('I have swelling and pain').intent,'clinical_handoff');
 applyDecision(c,s,ruleDecision('Talk to staff',s),'Talk to staff');assert.ok(s.handoff);assert.equal(chinese.test(s.messages.at(-1)!.text),false);
});
test('Support style uses explicit language; repeats have a bounded window and no age guess',()=>{
 assert.equal(supportCue('I am nervous'),'reassurance');assert.equal(supportCue('我按錯了'),'step_by_step');assert.equal(supportCue('I am 70'),'neutral');assert.equal(supportCue('This is frustrating'),'frustration');
 const c=seed(),id=createSession(c),s=getSession(c,id);beginMessage(c,id,'我要改期');assert.ok(repeated(s,'我要改期！'));assert.equal(repeated(s,'我要取消'),false);assert.equal(repeated(s,'我要改期',Date.now()+61000),false);
 assert.equal(chinese.test(localize('今日 AI 示範額度已達上限，預約資料仍保留。','en')),false);
});
