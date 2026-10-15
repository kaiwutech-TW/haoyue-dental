"""Colab GPU LoRA smoke/training. No cloud credentials; synthetic corpus only."""
import argparse,json,time
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--steps',type=int,default=30);p.add_argument('--output',default='artifacts/haoyue-lora');a=p.parse_args()
import torch
from transformers import AutoTokenizer,AutoModelForCausalLM
from peft import LoraConfig,get_peft_model
assert torch.cuda.is_available(),'CUDA GPU required; do not silently run on CPU'
model_id='nvidia/NVIDIA-Nemotron-3-Nano-4B-BF16'
# Official NVIDIA remote implementation. Pin the resolved revision in the report.
from huggingface_hub import model_info
revision=model_info(model_id).sha
tok=AutoTokenizer.from_pretrained(model_id,revision=revision,trust_remote_code=True)
model=AutoModelForCausalLM.from_pretrained(model_id,revision=revision,trust_remote_code=True,torch_dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16,device_map={'':'cuda'},attn_implementation='eager')
model.config.use_cache=False
model=get_peft_model(model,LoraConfig(r=8,lora_alpha=16,lora_dropout=0.05,target_modules=['q_proj','v_proj'],task_type='CAUSAL_LM'))
model.train();opt=torch.optim.AdamW([x for x in model.parameters() if x.requires_grad],lr=1e-4)
rows=[json.loads(x) for x in Path('data/train.jsonl').read_text().splitlines()]
losses=[];start=time.time();torch.manual_seed(42)
for step in range(a.steps):
 row=rows[step%len(rows)]
 prompt=tok.apply_chat_template(row['messages'][:-1],tokenize=False,add_generation_prompt=True,enable_thinking=False)
 full=prompt+row['intent']+tok.eos_token
 encoded=tok(full,return_tensors='pt',truncation=False).to('cuda')
 assert encoded.input_ids.shape[1]<=512,'Unexpected long sample'
 labels=encoded.input_ids.clone();n=len(tok(prompt,add_special_tokens=False).input_ids);labels[:,:n]=-100
 opt.zero_grad();output=model(**encoded,labels=labels,num_logits_to_keep=0);loss=output.loss
 assert torch.isfinite(loss),'Non-finite loss'
 loss.backward();torch.nn.utils.clip_grad_norm_(model.parameters(),1);opt.step();losses.append(float(loss.detach()))
 print(json.dumps({'step':step+1,'loss':losses[-1]}),flush=True)
out=Path(a.output);out.mkdir(parents=True,exist_ok=True);model.save_pretrained(out);tok.save_pretrained(out)
report={'model':model_id,'revision':revision,'gpu':torch.cuda.get_device_name(),'steps':a.steps,'losses':losses,'seconds':time.time()-start,'peakMemoryBytes':torch.cuda.max_memory_allocated(),'scope':'Intent-only LoRA smoke. Not proof of slot extraction or production quality.'}
(out/'training-report.json').write_text(json.dumps(report,indent=2))
