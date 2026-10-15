"""Serve the same NVIDIA LoRA choice weights on Apple silicon with MLX.
No autoregressive generation; no quantization. PEFT matrices stay separate.
"""
import hashlib,json,time
from pathlib import Path
import mlx.core as mx
import mlx.nn as nn
from mlx_lm import load

class LoRALinear(nn.Module):
 def __init__(self,base,a,b,scale):
  super().__init__();self.base=base;self.a=a;self.b=b;self.scale=scale
 def __call__(self,x):
  y=self.base(x)
  delta=(x.astype(self.a.dtype)@self.a.T)@self.b.T
  return (y+delta*self.scale).astype(y.dtype)

class ChoiceModel:
 def __init__(self,base='artifacts/models/nemotron4b',adapter='artifacts/haoyue-choice-v2'):
  path=Path(adapter)
  manifest=json.loads((path/'artifact-hashes.json').read_text())
  for name,digest in manifest.items():
   if hashlib.sha256((path/name).read_bytes()).hexdigest()!=digest:raise ValueError(f'Adapter integrity failure: {name}')
  self.config=json.loads((path/'decision-config.json').read_text())
  peft=json.loads((path/'adapter_config.json').read_text())
  assert peft['r']==8 and peft['lora_alpha']==16 and not peft['use_dora'] and not peft['use_rslora']
  self.model,self.tok=load(base);self.model.eval()
  weights=mx.load(str(path/'adapter_model.safetensors'))
  count=0
  for key,a in weights.items():
   if not key.endswith('.lora_A.weight'):continue
   target=key.removeprefix('base_model.model.').removesuffix('.lora_A.weight')
   b=weights[key.replace('.lora_A.weight','.lora_B.weight')]
   parts=target.split('.');parent=self.model
   for part in parts[:-1]:parent=parent[int(part)] if part.isdigit() else getattr(parent,part)
   name=parts[-1];base_layer=getattr(parent,name)
   assert isinstance(base_layer,nn.Linear) and a.shape[0]==peft['r']
   setattr(parent,name,LoRALinear(base_layer,a,b,peft['lora_alpha']/peft['r']));count+=1
  assert count>0 and count*2==len(weights),'Unexpected adapter matrices'
  self.adapter_hash=hashlib.sha256((path/'adapter_model.safetensors').read_bytes()).hexdigest()
  self.ids=mx.array([self.tok.encode(c,add_special_tokens=False)[0] for c in self.config['codes']])
  assert all(len(self.tok.encode(c,add_special_tokens=False))==1 for c in self.config['codes'])
  self.head=self.model.lm_head.weight[self.ids];mx.eval(self.model.parameters(),self.head)
 def predict(self,text):
  started=time.perf_counter()
  prompt=self.tok.apply_chat_template([{'role':'system','content':self.config['system']},{'role':'user','content':text}],tokenize=False,add_generation_prompt=True,enable_thinking=False)
  tokens=self.tok.encode(prompt,add_special_tokens=False)
  if len(tokens)>512:raise ValueError('Input exceeds the 512-token decision limit')
  h=self.model.backbone(mx.array(tokens)[None,:])[:,-1,:]
  z=(h@self.head.T).astype(mx.float32).squeeze(0)
  p=mx.softmax(z/self.config['temperature']);mx.eval(p)
  probs=dict(zip(self.config['intents'],p.tolist()));intent=max(probs,key=probs.get);confidence=probs[intent]
  return {'intent':intent,'confidence':confidence,'probabilities':probs,'abstain':confidence<self.config['threshold'],'latencyMs':(time.perf_counter()-started)*1000,'inputTokens':len(tokens),'model':self.config['baseModel'],'version':self.config['version'],'adapterSha256':self.adapter_hash,'runtime':'MLX / Apple silicon'}
