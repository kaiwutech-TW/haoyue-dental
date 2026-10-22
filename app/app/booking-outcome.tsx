import {doctorName,type Locale} from '@/lib/dental/language';
import type {Appointment,Proposal,Receipt} from '@/lib/dental/domain';

function Booking({appointment,locale}:{appointment:Pick<Appointment,'slot'|'doctor'>|null;locale:Locale}){
 if(!appointment)return <span>{locale==='en'?'No appointment':'無預約'}</span>;
 return <span><b>{appointment.slot.replace('T',' · ')}</b><small>{doctorName(appointment.doctor,locale)} · {locale==='en'?'Taipei time':'台北時間'}</small></span>;
}

export default function BookingOutcome({locale,proposal,receipt}:{locale:Locale;proposal?:Proposal|null;receipt?:Receipt}){
 const en=locale==='en';
 if(!proposal&&!receipt)return null;
 const kind=proposal?.kind??receipt!.kind;
 const before=proposal?proposal.before??null:receipt!.before;
 const after=kind==='cancel'?null:proposal??receipt!.after;
 return <section className={`booking-outcome ${proposal?'pending':'saved'}`} aria-label={en?'Booking outcome':'預約異動結果'}>
  <div className="outcome-heading"><b>{proposal?(en?'Review before confirming':'確認前，先看變更內容'):(en?'Latest saved change':'最近一次已儲存異動')}</b><span>{proposal?(en?'NOT SAVED':'尚未儲存'):(en?'SAVED':'已儲存')}</span></div>
  <div className="booking-diff"><div><small>{en?'Before':'原預約'}</small><Booking appointment={before} locale={locale}/></div><span className="diff-arrow" aria-hidden="true">→</span><div><small>{en?'After':'變更後'}</small><Booking appointment={after} locale={locale}/></div></div>
  <p>{proposal?(en?'Your original booking stays unchanged until you confirm and the save succeeds.':'明確確認且儲存成功後才生效；目前原預約維持不變。'):(en?`Read back from storage · v${receipt!.after.version} · ${new Date(receipt!.at).toLocaleTimeString('en-GB',{timeZone:'Asia/Taipei'})}`:`已從儲存資料讀回 · v${receipt!.after.version} · ${new Date(receipt!.at).toLocaleTimeString('zh-TW',{timeZone:'Asia/Taipei'})}`)}</p>
 </section>;
}
