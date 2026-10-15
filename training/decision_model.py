"""NVIDIA LoRA choice model. One forward pass; no generated decision prose.
Inspired by the decision-model pattern, not an implementation of Kev's attention masks.
"""
import json, time, random, hashlib
from pathlib import Path
import torch
import torch.nn.functional as F
INTENTS=['book','reschedule','cancel','appointment_lookup','admin_faq','human_request','clinical_handoff','unclear']
CODES=list('ABCDEFGH')
MODEL_ID='nvidia/NVIDIA-Nemotron-3-Nano-4B-BF16'
SYSTEM='你是台灣牙醫行政客服決策器。請判斷最後一句話的意圖，只選一個代碼。A=新增預約；B=更改原預約時間；C=明確取消預約；D=查詢已有預約；E=診所行政資訊；F=要求真人或代辦家人；G=症狀、診斷或用藥；H=不清楚需要澄清。預約檢查屬A，問是否營業屬E。'

def prompt(tok,row):
 return tok.apply_chat_template([{'role':'system','content':SYSTEM},{'role':'user','content':row['text']}],tokenize=False,add_generation_prompt=True,enable_thinking=False)

def encode(tok,row,device='cuda'):
 x=tok(prompt(tok,row),return_tensors='pt',add_special_tokens=False).to(device)
 if x.input_ids.shape[1]>512:raise ValueError('Example too long; no silent truncation')
 return x

def choice_logits(model,tok,row):
 base=model.get_base_model() if hasattr(model,'get_base_model') else model
 token_ids=[tok.encode(c,add_special_tokens=False) for c in CODES]
 assert all(len(x)==1 for x in token_ids),'Each choice must be a single token'
 # Project only the final hidden state into eight frozen vocabulary rows.
 # LoRA lives in backbone attention modules; no autoregressive generation loop.
 x=encode(tok,row)
 h=base.backbone(**x,use_cache=False,return_dict=True).last_hidden_state[:,-1,:]
 ids=torch.tensor([x[0] for x in token_ids],device=h.device)
 weight=base.lm_head.weight.index_select(0,ids)
 return F.linear(h.to(weight.dtype),weight).float().squeeze(0)

@torch.no_grad()
def collect(model,tok,rows):
 model.eval();logits=[];latencies=[]
 for row in rows:
  torch.cuda.synchronize();start=time.perf_counter();z=choice_logits(model,tok,row);torch.cuda.synchronize()
  logits.append(z.cpu());latencies.append((time.perf_counter()-start)*1000)
 return torch.stack(logits),latencies

def calibrate(logits,labels):
 candidates=torch.logspace(-1,1,81)
 losses=[F.cross_entropy(logits/t,labels).item() for t in candidates]
 return float(candidates[min(range(len(losses)),key=losses.__getitem__)])

def metrics(logits,rows,temperature=1,latencies=None):
 y=torch.tensor([INTENTS.index(r['intent']) for r in rows]);p=(logits/temperature).softmax(-1);conf,pred=p.max(-1);accepted=conf>=.85
 return {'n':len(rows),'correct':int((pred==y).sum()),'accuracy':float((pred==y).float().mean()),'temperature':temperature,'brier':float(((p-F.one_hot(y,8))**2).sum(-1).mean()),'nll':float(F.cross_entropy(logits/temperature,y)),'threshold':.85,'accepted':int(accepted.sum()),'acceptedErrors':int(((pred!=y)&accepted).sum()),'latenciesMs':latencies,'predictions':[{'text':r['text'],'expected':r['intent'],'predicted':INTENTS[int(pred[i])],'confidence':float(conf[i]),'probabilities':{k:float(p[i,j]) for j,k in enumerate(INTENTS)}} for i,r in enumerate(rows)]}

def run(model,tok,revision,root='.',epochs=2,max_seconds=1200):
 root=Path(root);out=root/'artifacts/haoyue-choice';out.mkdir(parents=True,exist_ok=True)
 rows={s:[json.loads(x) for x in (root/'data'/f'{s}.jsonl').read_text().splitlines()] for s in ['train','validation','test']}
 torch.manual_seed(42);random.seed(42)
 with model.disable_adapter():base_z,base_ms=collect(model,tok,rows['test'])
 report={'model':MODEL_ID,'revision':revision,'gpu':torch.cuda.get_device_name(),'architecture':'LoRA eight-choice final-state projection; not Kev masked multi-query architecture','base':metrics(base_z,rows['test'],latencies=base_ms),'datasetHashes':{s:hashlib.sha256((root/'data'/f'{s}.jsonl').read_bytes()).hexdigest() for s in rows}}
 opt=torch.optim.AdamW([p for p in model.parameters() if p.requires_grad],lr=2e-4)
 train=rows['train'];losses=[];start=time.time()
 for epoch in range(epochs):
  order=list(range(len(train)));random.Random(42+epoch).shuffle(order);model.train()
  for i in order:
   if time.time()-start>max_seconds:raise TimeoutError('Training time cap reached; no unattended run')
   opt.zero_grad();z=choice_logits(model,tok,train[i]);target=torch.tensor([INTENTS.index(train[i]['intent'])],device=z.device)
   loss=F.cross_entropy(z.unsqueeze(0),target)
   if not torch.isfinite(loss):raise RuntimeError('Non-finite loss')
   loss.backward();grad=torch.nn.utils.clip_grad_norm_(model.parameters(),1)
   if not torch.isfinite(grad):raise RuntimeError('Non-finite gradient')
   opt.step();losses.append(float(loss.detach()))
   if len(losses)==1 or len(losses)%10==0:print(json.dumps({'step':len(losses),'loss':losses[-1],'seconds':round(time.time()-start)}),flush=True)
  model.save_pretrained(out);tok.save_pretrained(out)
 val_z,_=collect(model,tok,rows['validation']);t=calibrate(val_z,torch.tensor([INTENTS.index(r['intent']) for r in rows['validation']]))
 test_z,test_ms=collect(model,tok,rows['test']);report.update({'trained':metrics(test_z,rows['test'],t,test_ms),'steps':len(losses),'losses':losses,'seconds':time.time()-start,'peakMemoryBytes':torch.cuda.max_memory_allocated(),'limitations':'Small author-written synthetic test, not independent real clinic validation; confidence calibration requires larger reviewed dataset.'})
 (out/'decision-config.json').write_text(json.dumps({'intents':INTENTS,'codes':CODES,'temperature':t,'threshold':.85,'baseModel':MODEL_ID,'revision':revision,'system':SYSTEM},ensure_ascii=False,indent=2))
 (out/'evaluation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print('EVALUATION',json.dumps({k:v for k,v in report.items() if k in ['steps','seconds','peakMemoryBytes']},ensure_ascii=False),flush=True)
 print('BASE',report['base']['correct'],'/',report['base']['n'],'TRAINED',report['trained']['correct'],'/',report['trained']['n'],flush=True)
 return report
