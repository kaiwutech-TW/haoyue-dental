"""Run inside the isolated Colab environment, with an outer process time limit."""
import os,sys,json,time
from pathlib import Path
os.environ['HF_HUB_DISABLE_PROGRESS_BARS']='1'
import torch
from transformers import AutoTokenizer,AutoModelForCausalLM
from peft import LoraConfig,get_peft_model
from training.decision_model import MODEL_ID,choice_logits,run,INTENTS

REVISION='dfaf35de3e30f1867dd8dbc38a7fc9fb52d3914f'
def load():
 assert torch.cuda.is_available(),'GPU required; never silently train on CPU'
 print('GPU',torch.cuda.get_device_name(),'TORCH',torch.__version__,flush=True)
 tok=AutoTokenizer.from_pretrained(MODEL_ID,revision=REVISION,trust_remote_code=True)
 model=AutoModelForCausalLM.from_pretrained(MODEL_ID,revision=REVISION,trust_remote_code=True,torch_dtype=torch.bfloat16,device_map={'':'cuda'},attn_implementation='eager')
 model.config.use_cache=False
 model=get_peft_model(model,LoraConfig(r=8,lora_alpha=16,lora_dropout=.05,target_modules=['q_proj','v_proj'],task_type='CAUSAL_LM'))
 model.gradient_checkpointing_enable();model.enable_input_require_grads()
 model.print_trainable_parameters()
 print('MODEL_LOADED',next(model.parameters()).device,torch.cuda.memory_allocated(),flush=True)
 return model,tok

def smoke(model,tok,root):
 row=json.loads((root/'data/train.jsonl').read_text().splitlines()[0])
 model.train();torch.cuda.reset_peak_memory_stats();start=time.time()
 z=choice_logits(model,tok,row)
 assert z.is_cuda and z.requires_grad
 loss=torch.nn.functional.cross_entropy(z[None,:],torch.tensor([INTENTS.index(row['intent'])],device=z.device))
 print('FORWARD_OK',float(loss.detach()),flush=True)
 loss.backward();grad=torch.nn.utils.clip_grad_norm_(model.parameters(),1)
 assert torch.isfinite(loss) and torch.isfinite(grad) and float(grad)>0
 parameter=next(p for n,p in model.named_parameters() if 'lora_B' in n and p.grad is not None and torch.count_nonzero(p.grad)>0)
 before=parameter.detach().clone();opt=torch.optim.AdamW([p for p in model.parameters() if p.requires_grad],lr=2e-4);opt.step()
 assert not torch.equal(before,parameter),'No LoRA weight changed'
 torch.cuda.synchronize()
 report={'model':MODEL_ID,'revision':REVISION,'gpu':torch.cuda.get_device_name(),'torch':torch.__version__,'loss':float(loss.detach()),'gradNorm':float(grad),'weightChanged':True,'seconds':time.time()-start,'peakMemoryBytes':torch.cuda.max_memory_allocated()}
 (root/'smoke.json').write_text(json.dumps(report,indent=2));print('BACKWARD_OK',json.dumps(report),flush=True)

if __name__=='__main__':
 root=Path.cwd();model,tok=load()
 if '--train' in sys.argv:run(model,tok,REVISION,root=root)
 else:smoke(model,tok,root)
