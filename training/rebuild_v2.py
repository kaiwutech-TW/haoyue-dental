"""Rebuild the frozen corpus without model calls. --check never writes."""
from pathlib import Path
import json,hashlib,sys
root=Path(__file__).resolve().parents[1]/'data/v2'
source=json.loads((root/'source.json').read_text());manifest=json.loads((root/'manifest.json').read_text());seen=set();families=set()
for split,groups in source.items():
 rows=[]
 for label,texts in groups.items():
  for i,text in enumerate(texts):
   family=f'v2-{split}-{label}-{i:02d}'
   assert text not in seen and family not in families,'Text/family overlap'
   seen.add(text);families.add(family);rows.append({'family':family,'text':text,'intent':label})
 raw=''.join(json.dumps(r,ensure_ascii=False,sort_keys=True)+'\n' for r in rows).encode()
 assert hashlib.sha256(raw).hexdigest()==manifest['splits'][split]['sha256']
 if '--check' in sys.argv:assert (root/f'{split}.jsonl').read_bytes()==raw
 else:(root/f'{split}.jsonl').write_bytes(raw)
 print(split,len(rows),'hash verified')
