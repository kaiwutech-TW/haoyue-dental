"""Deterministic synthetic intent corpus; families, not random rows, define splits."""
import hashlib,json
from pathlib import Path
families={
'book':[['想預約洗牙','幫我掛號','想約看牙'],['第一次去你們那邊可以預約嗎'],['最近想安排牙齒檢查']],
'reschedule':[['我要改期','不是取消，是改時間','原本那天不方便想換一天'],['原來的預約想往後挪'],['我臨時要加班，能換時間嗎']],
'cancel':[['我要取消預約','這次不去了請取消','確定取消不用改期'],['請把我的掛號退掉'],['原先約好的那次取消吧']],
'appointment_lookup':[['查我的預約','我約幾點','幫我確認掛號時間'],['忘記上次約在哪天'],['我下次什麼時候要去']],
'admin_faq':[['幾點營業','診所地址在哪','可以刷卡嗎'],['初診需要帶什麼'],['你們星期天有開嗎']],
'human_request':[['找真人','請轉櫃台','我要找人工客服'],['能請櫃台人員回我嗎'],['不要機器人，請人員接手']],
'clinical_handoff':[['牙痛要吃什麼藥','拔牙後流血怎麼辦','牙齦腫起來'],['我對止痛藥過敏怎麼辦'],['臉腫又發燒，能先吃抗生素嗎']],
'unclear':[['先不要','等等好了','那個幫我處理一下'],['就照剛剛那樣吧'],['算了，還是再想想']]
}
out=Path('data');out.mkdir(exist_ok=True)
manifest={'version':1,'source':'Original author-written synthetic Taiwan dental administrative examples. No scraped conversations or patient records.','limitations':'Small template corpus; held-out families still authored by same process, not an independent clinical/customer validation. Intent-only warmup, not full slot extraction.','splits':{}}
all_families=[]
for i,split in enumerate(['train','validation','test']):
 rows=[]
 for intent,groups in families.items():
  for j,text in enumerate(groups[i]):
   family=f'{intent}-{split}-{j}';all_families.append((family,split))
   for prefix in (['','您好，','不好意思，','請問一下，'] if split=='train' else ['']):
    rows.append({'family':family,'text':prefix+text,'intent':intent,'messages':[{'role':'system','content':'你是台灣牙醫行政客服意圖分類器。只輸出意圖名稱：book,reschedule,cancel,appointment_lookup,admin_faq,human_request,clinical_handoff,unclear。症狀或用藥交 clinical_handoff。'},{'role':'user','content':prefix+text},{'role':'assistant','content':intent}]})
 payload=''.join(json.dumps(r,ensure_ascii=False,sort_keys=True)+'\n' for r in rows)
 (out/f'{split}.jsonl').write_text(payload)
 manifest['splits'][split]={'rows':len(rows),'sha256':hashlib.sha256(payload.encode()).hexdigest(),'families':sorted(set(r['family'] for r in rows))}
assert len({f for f,s in all_families})==len(all_families)
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(manifest['splits'],ensure_ascii=False))
