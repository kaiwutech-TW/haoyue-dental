import comparison from '../public/evidence/decision-comparison.json';
import type {Locale} from '@/lib/dental/language';

export default function EvaluationEvidence({locale}:{locale:Locale}){
 const en=locale==='en';
 return <section className="evaluation-evidence" aria-label={en?'Decision comparison':'決策比較'}>
  <h3>{en?'Does the specialised model add value?':'專用模型，實際多做對了什麼？'}</h3>
  <p>{en?'The same 64 fixed synthetic inputs and labels. Rules are executed again; NVIDIA predictions come from the saved CUDA experiment. This compares single-message intent, not complete booking success.':'同一份 64 題固定合成輸入、相同標籤。規則重新執行；NVIDIA 預測使用已保存的 CUDA 實驗。比較單句意圖，不等於完整預約成功率。'}</p>
  <div className="comparison-chart">{comparison.rows.map(row=><div key={row.id}><span>{row.id==='rule'?(en?'Rules':'手寫規則'):row.id==='base'?'NVIDIA 4B':'NVIDIA 4B + LoRA'}</span><meter min={0} max={comparison.n} value={row.correct} aria-label={row.label}/><b>{row.correct} / {comparison.n}</b></div>)}</div>
  <div className="evidence-table-wrap"><table><caption>{en?'Selective prediction at score threshold 0.85':'相同分數門檻 0.85 的選擇性預測'}</caption><thead><tr><th scope="col">{en?'Model':'模型'}</th><th scope="col">{en?'Accepted':'接受數'}</th><th scope="col">{en?'Wrong among accepted':'接受中仍錯誤'}</th></tr></thead><tbody>{comparison.rows.filter(row=>row.accepted!==null).map(row=><tr key={row.id}><th scope="row">{row.id==='base'?'NVIDIA 4B':'NVIDIA 4B + LoRA'}</th><td>{row.accepted} / {comparison.n}</td><td>{row.acceptedErrors}</td></tr>)}</tbody></table></div>
  <p className="evidence-caveat">{en?'One high-score error remains. Every write still requires validation and confirmation. These author-written cases are not independent clinical validation. Model rows omit the app’s safety overrides; rules include handwritten safety routes. Equal bilingual quality, workload reduction and cloud cost saving remain unmeasured.':'高分仍有一次錯誤，異動仍須驗證與確認。同一作者的合成資料不是獨立臨床驗證；模型列未套用應用護欄，規則列包含手寫轉接規則。尚未證明雙語等效、減少櫃台工時或雲端省費。'}</p>
  <a href="/evidence/decision-comparison.json" target="_blank" rel="noreferrer">{en?'Inspect inputs, labels and saved predictions ↗':'查看題目、標籤與保存預測 ↗'}</a>
  <details><summary>{en?'What we test when things go wrong':'出錯時，我們驗證什麼'}</summary><ul><li>{en?'Conflicting slots and stale confirmations cannot overwrite the current booking.':'時段衝突與舊確認不得覆蓋目前預約。'}</li><li>{en?'An identical confirmation is replayed without another write.':'同一確認重送，不新增第二次異動。'}</li><li>{en?'Unclear intent asks for clarification. Symptoms and family requests go to a human.':'意圖不明先澄清；症狀與家人代辦交真人。'}</li><li>{en?'Unavailable models and expired budget checks do not become invented successful decisions.':'模型失敗或預算查核過期，不虛構成功判斷。'}</li><li>{en?'Visitor workspaces are independent; same-workspace conflicts remain protected.':'訪客示範範圍獨立；同一範圍內仍有衝突保護。'}</li></ul><a href="https://github.com/kaiwutech-TW/haoyue-dental/tree/main/app/tests" target="_blank" rel="noreferrer">{en?'Read executable checks ↗':'查看可執行的測試 ↗'}</a></details>
 </section>;
}
