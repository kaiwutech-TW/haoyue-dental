import json,time,hashlib
from pathlib import Path
import torch
from transformers import AutoTokenizer,AutoModelForCausalLM
from peft import PeftModel
from training.decision_model import MODEL_ID,collect,metrics
from training.gpu_runner import REVISION
root=Path('/content/haoyue')
raw=(root/'data/challenge.json').read_bytes()
rows=[{'text':text,'intent':intent} for intent,texts in json.loads(raw).items() for text in texts]
print('LOADING',flush=True)
tok=AutoTokenizer.from_pretrained(MODEL_ID,revision=REVISION,trust_remote_code=True)
base=AutoModelForCausalLM.from_pretrained(MODEL_ID,revision=REVISION,trust_remote_code=True,torch_dtype=torch.bfloat16,device_map={'':'cuda'},attn_implementation='eager')
model=PeftModel.from_pretrained(base,root/'artifacts/haoyue-choice')
with model.disable_adapter():bz,bms=collect(model,tok,rows)
tz,tms=collect(model,tok,rows)
temperature=json.loads((root/'artifacts/haoyue-choice/decision-config.json').read_text())['temperature']
report={'model':MODEL_ID,'revision':REVISION,'datasetHash':hashlib.sha256(raw).hexdigest(),'limitations':'Author-written diagnostic challenge created after initial 8-item results were seen; not an untouched final test or real-patient validation.','base':metrics(bz,rows,latencies=bms),'trainedRaw':metrics(tz,rows,latencies=tms),'trainedCalibrated':metrics(tz,rows,temperature,tms)}
(root/'challenge-evaluation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print({k:{x:report[k][x] for x in ['correct','n','accepted','acceptedErrors','nll']} for k in ['base','trainedRaw','trainedCalibrated']},flush=True)
