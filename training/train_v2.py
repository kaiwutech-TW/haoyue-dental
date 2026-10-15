"""Fixed v2 experiment. Select checkpoints/calibration only on development data."""
import hashlib,json,random,time
from pathlib import Path
import torch
import torch.nn.functional as F
from training.gpu_runner import load,REVISION
from training.decision_model import choice_logits,collect,metrics,MODEL_ID,INTENTS,CODES,SYSTEM

def temperature(z,rows):
 y=torch.tensor([INTENTS.index(r['intent']) for r in rows])
 # Never sharpen the small-data model. Calibration may only reduce confidence.
 ts=torch.logspace(0,1,81)
 return float(min(ts,key=lambda t:F.cross_entropy(z/t,y).item()))

def main():
 root=Path.cwd();out=root/'artifacts/haoyue-choice-v2';out.mkdir(parents=True,exist_ok=True)
 data=root/'data/v2';rows={s:[json.loads(l) for l in (data/f'{s}.jsonl').read_text().splitlines()] for s in ['train','validation','test']}
 hashes={s:hashlib.sha256((data/f'{s}.jsonl').read_bytes()).hexdigest() for s in rows}
 # Written before optimization; test is evaluated once after checkpoint selection.
 print('FROZEN_DATASET',hashes,flush=True)
 torch.manual_seed(42);random.seed(42)
 model,tok=load();torch.cuda.reset_peak_memory_stats()
 with model.disable_adapter():bv,_=collect(model,tok,rows['validation'])
 bt=temperature(bv,rows['validation']);opt=torch.optim.AdamW([p for p in model.parameters() if p.requires_grad],lr=5e-5)
 history=[];losses=[];best=float('inf');best_state=None;start=time.time()
 for epoch in range(4):
  order=list(range(len(rows['train'])));random.Random(42+epoch).shuffle(order);model.train()
  for i in order:
   if time.time()-start>900:raise TimeoutError('15 min optimization cap')
   opt.zero_grad();z=choice_logits(model,tok,rows['train'][i]);y=torch.tensor([INTENTS.index(rows['train'][i]['intent'])],device=z.device)
   loss=F.cross_entropy(z[None,:],y,label_smoothing=.05);loss.backward();grad=torch.nn.utils.clip_grad_norm_(model.parameters(),1)
   if not torch.isfinite(loss) or not torch.isfinite(grad):raise ValueError('Non-finite optimization')
   opt.step();losses.append(float(loss.detach()))
   if len(losses)%24==0:print('STEP',len(losses),'LOSS',round(losses[-1],4),'SECONDS',round(time.time()-start),flush=True)
  vz,_=collect(model,tok,rows['validation']);v=metrics(vz,rows['validation']);history.append({'epoch':epoch+1,'correct':v['correct'],'nll':v['nll']})
  if v['nll']<best:
   best=v['nll'];best_state={n:p.detach().cpu().clone() for n,p in model.named_parameters() if p.requires_grad};selected=epoch+1
  print('VALIDATION',history[-1],flush=True)
 assert best_state is not None
 with torch.no_grad():
  for n,p in model.named_parameters():
   if n in best_state:p.copy_(best_state[n].to(p.device))
 vz,_=collect(model,tok,rows['validation']);t=temperature(vz,rows['validation'])
 with model.disable_adapter():bz,bms=collect(model,tok,rows['test'])
 tz,tms=collect(model,tok,rows['test'])
 model.save_pretrained(out);tok.save_pretrained(out)
 report={'model':MODEL_ID,'revision':REVISION,'gpu':torch.cuda.get_device_name(),'architecture':'LoRA eight-choice final-state projection; not Kev masked multi-query architecture','datasetHashes':hashes,'training':{'steps':len(losses),'epochs':4,'selectedEpoch':selected,'lr':5e-5,'labelSmoothing':.05,'seed':42,'seconds':time.time()-start,'peakMemoryBytes':torch.cuda.max_memory_allocated()},'validationHistory':history,'baseRaw':metrics(bz,rows['test'],latencies=bms),'baseCalibrated':metrics(bz,rows['test'],bt,bms),'trainedRaw':metrics(tz,rows['test'],latencies=tms),'trainedCalibrated':metrics(tz,rows['test'],t,tms),'limitations':'Synthetic same-author test authored and hashed before v2 optimization; validation was the inspected v1 challenge. Not an independent clinical or customer study. Latency is GPU forward only, not API end-to-end.'}
 (out/'decision-config.json').write_text(json.dumps({'intents':INTENTS,'codes':CODES,'temperature':t,'threshold':.85,'baseModel':MODEL_ID,'revision':REVISION,'system':SYSTEM,'version':'haoyue-choice-v2'},ensure_ascii=False,indent=2))
 (out/'evaluation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print('FINISHED',json.dumps({'selectedEpoch':selected,'temperature':t,'training':report['training'],'metrics':{k:{x:report[k][x] for x in ['correct','n','nll','accepted','acceptedErrors']} for k in ['baseRaw','baseCalibrated','trainedRaw','trainedCalibrated']}}),flush=True)
if __name__=='__main__':main()
