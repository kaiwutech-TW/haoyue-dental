export type Locale='zh'|'en';
export const doctorName=(name:string,locale:Locale='zh')=>locale==='en'?name.replaceAll('陳醫師','Dr. Chen').replaceAll('林醫師','Dr. Lin'):name;
export const patientName=(id:string,locale:Locale='zh')=>locale==='en'?(id==='lin'?'Claire Lin':'Mr. Wu'):(id==='lin'?'林小晴':'吳先生');
// Approved presentation copy. Never translate patient messages or staff replies.
const copy:Record<string,string>={
'資料服務暫時無法使用':'The data service is temporarily unavailable. Please retry.',
'您的訊息已收到，不需要重複點擊。可以直接輸入下一個需求，例如「查詢預約」，或選「找真人」，我會一步一步協助您。':'I have your message—you don’t need to click again. Type your next request, such as “Check my appointment”, or choose human help. We can go step by step.',
'示範使用次數已達上限，請稍後再試。':'Demo usage limit reached. Please try again later.',
'示範暫停':'Demo paused','示範容量已滿，請稍後再試。':'Demo capacity reached. Please try again later.',
'AI 示範已暫停。':'AI demo paused.','AI 示範暫停，等待管理員確認額度。':'AI fallback is paused pending an administrator balance check.',
'今日 AI 示範額度已達上限，預約資料仍保留。':'Today’s AI demo allowance is exhausted. Your appointment remains unchanged.',
'此對話已達 AI 體驗次數上限。':'This conversation has reached its AI demo limit.',
'您好，我是好約小幫手 🌿\n想預約、調整時間，或找櫃台聊聊，都可以告訴我。這裡是虛構診所示範，不會建立真實掛號。':'Hello, I’m your HAOYUE assistant 🌿\nType what you need: book, reschedule, check an appointment, or speak to the desk. This fictional clinic demo never makes a real booking.',
'我想再確認一下，您是要預約、改期、取消，還是查詢原本的時間呢？':'Let me check: would you like to book, reschedule, cancel, or look up an appointment?',
'我想再確認一下，您是要預約、改期、取消，還是查詢原本的時間呢？原預約會先保留。':'Would you like to book, reschedule, cancel, or look up an appointment? Your existing booking stays unchanged.',
'您想取消，還是改到其他時間呢？我先保留原預約。':'Would you like to cancel or choose a different time? I will keep your existing booking for now.',
'下班後大約幾點方便呢？可以直接選下方的晚間時段。':'What time works after work? You can choose an evening time below.',
'這類症狀需要由醫療人員判斷，我無法提供診斷或用藥建議。':'A clinician needs to assess symptoms. I cannot diagnose or recommend medication.',
'好的，我幫您留下訊息給櫃台。':'Of course. I will leave your message for the front desk.',
'\n已建立示範交接案件，等待櫃台接手；目前尚未有人回覆。原預約維持不變。':'\nA demo handoff case is open. No staff member has replied yet. Your appointment stays unchanged.',
' 原預約維持不變，等待櫃台回覆。':' Your appointment stays unchanged while we wait for the desk.',
'目前沒有有效的示範預約。':'You have no active demo appointments.',
'這項資訊還沒有經過診所確認，我可以幫您轉交櫃台。':'The clinic has not approved an answer to that question. I can connect you with the front desk.',
'找不到屬於您的有效預約，請重新選擇。':'I could not find an active appointment belonging to you. Please select again.',
'目前沒有可以異動的預約。您想新增預約嗎？':'You have no appointment to change. Would you like to book one?',
'您有多筆預約，請先點選想調整的那一筆。':'You have several appointments. Select the one you want to change first.',
'沒問題，先幫您找時間 🌿\n請選擇方便的時段；還要再確認一次，才會變更預約。':'Let’s find a time that works 🌿\nChoose a slot below. Nothing changes until you confirm.',
'目前沒有符合條件的時段，方便換個日期或醫師嗎？':'No matching slots are available. Could you try another date or doctor?',
'示範診所週一至週六 09:00–12:00、14:00–17:00、18:00–21:00，週日休診。實際可預約時間以時段卡為準。':'Demo clinic hours: Monday–Saturday, 09:00–12:00, 14:00–17:00 and 18:00–21:00. Closed Sunday. Available bookings are shown on the slot cards.',
'這是虛構診所示範，沒有實體看診地址，也不會建立真實掛號。':'This is a fictional clinic with no physical practice address. No real appointments are created.',
'費用須由櫃台依實際療程與資格確認。這個示範不提供診療報價，也不收取任何費用。':'The front desk must confirm fees for the actual treatment and eligibility. This demo gives no treatment quotes and charges nothing.',
'先別急，我們可以慢慢來。':'Take your time. We can go one step at a time.',
'謝謝您告訴我您的擔心，我們可以一步一步來。':'Thank you for sharing your concern. We can take this one step at a time.',
'讓您感到不順利，辛苦了。我會先確認您的需求。':'I’m sorry this has been frustrating. Let’s first make sure I understand what you need.',
'沒關係，不需要一直點按鈕。您可以直接輸入「我要預約」或「查詢預約」，也可以選「找真人」。確認前不會更動預約。':'No problem—you don’t need to keep pressing buttons. Type “I want to book” or “Check my appointment”, or choose “Talk to staff”. Nothing changes before confirmation.',
'已收到同樣的需求，先保留畫面上的選項。慢慢選一個時段，或直接輸入想調整的地方即可；不需要重複點擊。':'I have your request and kept the current options. Take your time choosing a slot, or type what you want to change. You don’t need to click repeatedly.',
'收到患者訊息':'Patient message received','取得結構化意圖':'Structured intent received','已建立真人交接案件':'Human handoff case opened','讀取目前患者的預約':'Read this patient’s appointments','依目前會話的患者識別查詢，沒有寫入或異動預約。':'Read scoped to this session’s patient. No appointment was changed.',
'讀取已核准的診所知識':'Read approved clinic knowledge','找不到已核准答案':'No approved answer found','不採用未核准的搜尋結果。':'Unapproved search results are not used.','檢查預約規則與可用時段':'Validate booking rules and availability','等待患者確認':'Awaiting patient confirmation','預約異動已提交':'Appointment change committed',
'規則護欄直接轉接':'Safety rule triggered handoff','命中醫療／真人／家人代辦規則，本次沒有呼叫 NVIDIA 模型。':'A symptom, human-request, or family-booking rule matched. No NVIDIA inference was called.',
'訊息已送入交接案件':'Message added to the handoff case','等待真人櫃台回覆；本次沒有呼叫模型。':'Waiting for a human reply. No model was called.','NVIDIA 微調八選一判斷':'Fine-tuned NVIDIA: eight-way decision','分數未達 0.85，暫不採用；分數不是正確率。':'Score below 0.85: abstain. A score is not an accuracy guarantee.','單次前向完成意圖分類；日期與醫師由程式解析，異動仍須患者確認。':'Intent classified in one forward pass. Application code parses date and doctor; changes still need confirmation.',
'後備判斷路由':'Fallback route','微調服務暫時無法連線':'Fine-tuned endpoint unavailable','微調分數低於 0.85，交由 Nebius 再判斷':'Fine-tuned score below 0.85; request Nebius fallback','；後備判斷未完成，先向患者澄清':'; fallback unavailable, so ask for clarification',
'規則判斷完成':'Rule evaluation complete','模型判斷完成':'Model inference complete','已取得回應並通過決策資料格式驗證。':'Response received and validated against the decision schema.','模型額度護欄生效':'Model budget guard active','模型服務未完成判斷':'Model decision unavailable','本次未發出模型請求，改交真人處理。':'No model request issued; handing off to a human.','未取得可採用的有效決策，不把錯誤回應當作成功。':'No valid decision received. Failure is not reported as success.','目前無法可靠完成自動判斷，已保留您的預約。':'Automatic routing is unavailable. Your appointment has been preserved.',
'真人櫃台已回覆':'Human staff replied','回覆已送達這個患者會話，沒有使用模型生成。':'A staff-written reply was delivered to this session. It was not generated by a model.',
'耐心引導':'Patient guidance','重複需求，免再次推論':'Repeated request: no additional inference','語氣提示（規則）':'Response style cue (rules)','僅依文字明確線索調整說明方式，不判定年齡、人格或真實情緒。':'Explicit wording adjusts response style only. No age, personality or true emotion is inferred.',
'無效的示範患者':'Invalid demo patient','請重新開始示範':'Please restart the demo','請稍候再傳送訊息':'Please wait a moment before sending another message','案件已轉交櫃台':'This case has been handed to staff','請先說明預約需求':'Please tell us what you want to do','找不到可異動的預約':'No appointment available to change','請重新查詢可用時段':'Please search for available slots again','無效的確認':'Invalid confirmation','這份確認已失效，請重新選擇':'This confirmation has expired. Please select again.','這個時段已過期，請重新選擇':'This slot is in the past. Please choose again.','預約已有更新，請重新查詢':'The appointment has changed. Please check again.','這個時段剛被預約了。原預約仍保留，請改選其他時段。':'Someone just booked this slot. Your original appointment is safe. Please select another time.',
'訊息太長':'Message too long','示範容量已滿':'Demo capacity reached','請先選擇示範患者':'Please select a demo patient','無效的預約':'Invalid appointment','輸入格式不正確':'Invalid input format','暫時無法處理':'Unable to process this request right now',
'示範資料，不是真實掛號。':'demo data, not a real booking.','這是示範資料，不是真實掛號。':'This is demo data, not a real booking.','（台北時間）':' (Taipei time)','（台北時間）。':' (Taipei time).','\n按下確認後才會生效。':'\nOnly the confirmation button applies the change.',
'請確認：取消':'Please confirm cancellation:','請確認：新增預約':'Please confirm booking:','請確認：改期至':'Please confirm rescheduling to:','已取消預約：':'Appointment cancelled:','已完成預約：':'Appointment booked:','已完成改期：':'Appointment rescheduled:',
'。確認卡綁定此會話與預約版本，有效 10 分鐘；尚未寫入預約。':'. Confirmation is tied to this session and appointment version, expires in 10 minutes, and has not changed the booking.',
};
const entries=Object.entries(copy).sort((a,b)=>b[0].length-a[0].length);
export function localize(text:string,locale:Locale='zh'):string {
 if(locale!=='en')return text;
 if(copy[text])return copy[text];
 let result=text;
 for(const [zh,en] of entries)result=result.replaceAll(zh,en);
 result=doctorName(result,'en').replace(/依患者歸屬、門診日期、醫師及已占用時段篩選，找到 (\d+) 個選項。尚未變更預約。/g,'Validated patient ownership, dates, doctor and occupied slots: $1 options. No appointment changed.').replace(/來源：.*?。本次沒有呼叫 Tavily；Tavily 研究由管理員發起並審核。/g,'Source: approved fictional clinic policy. No Tavily call on this turn. Research requires admin review.').replaceAll('，',', ').replaceAll('。','. ');
 return result;
}
