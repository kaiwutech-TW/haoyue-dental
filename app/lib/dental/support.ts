import {message,type Session} from './domain.ts';
import {recordStep} from './trace.ts';
export type SupportCue='neutral'|'reassurance'|'frustration'|'step_by_step';
export function supportCue(text:string):SupportCue{
 if(/不會用|怎麼用|點錯|按錯|不懂怎麼|how (?:do i|to) use|clicked.*(?:accident|mistake)|don.t know how/i.test(text))return 'step_by_step';
 if(/很怕|害怕|擔心|緊張|scared|afraid|worried|anxious|nervous/i.test(text))return 'reassurance';
 if(/不耐煩|一直沒|很生氣|氣死|太慢|frustrat|angry|annoyed/i.test(text))return 'frustration';
 return 'neutral';
}
const normalized=(text:string)=>text.trim().toLowerCase().replace(/[\s!！?？。.,，]+/g,'');
export function repeated(s:Session,text:string,now=Date.now()){
 const last=s.messages.filter(m=>m.role==='user').at(-1);
 return !!last&&now-Date.parse(last.at)<60000&&normalized(last.text)===normalized(text);
}
export function guide(s:Session,text:string){
 const cue=supportCue(text);s.support=cue;
 if(cue!=='neutral')recordStep(s,'validation','語氣提示（規則）','僅依文字明確線索調整說明方式，不判定年齡、人格或真實情緒。');
 if(cue==='reassurance')message(s,'assistant','謝謝您告訴我您的擔心，我們可以一步一步來。');
 if(cue==='frustration')message(s,'assistant','讓您感到不順利，辛苦了。我會先確認您的需求。');
 return cue;
}
