"""Use colab exec --env HAOYUE_JOB_ACTION=prepare|setup|smoke|train|monitor|export."""
import os,json,hashlib,subprocess,zipfile,shutil
from pathlib import Path
root=Path('/content/haoyue');action=os.environ.get('HAOYUE_JOB_ACTION','monitor')
if action=='prepare':
 root.mkdir(exist_ok=True)
 with zipfile.ZipFile('/content/training-input.zip') as z:
  for name in z.namelist():
   p=Path(name)
   assert not p.is_absolute() and '..' not in p.parts and p.parts[0] in ['data','training']
  z.extractall(root)
 print('Prepared source only; no credentials in bundle')
elif action in ['setup','smoke','train']:
 pidfile=Path('/content/haoyue-job.pid')
 if pidfile.exists():
  pid=int(pidfile.read_text());cmdline=Path(f'/proc/{pid}/cmdline')
  if cmdline.exists() and b'haoyue' in cmdline.read_bytes():raise RuntimeError('Previous project job still running')
 commands={'setup':['bash','training/setup_colab.sh'],'smoke':['/content/haoyue-venv/bin/python','-u','-m','training.gpu_runner'],'train':['/content/haoyue-venv/bin/python','-u','-m','training.train_v2']}
 with open('/content/haoyue-job.log','w') as log:p=subprocess.Popen(['timeout','--signal=TERM','--kill-after=30s','1200',*commands[action]],cwd=root,stdout=log,stderr=subprocess.STDOUT)
 pidfile.write_text(str(p.pid));print(action,'started, pid',p.pid,'20-minute hard cap')
elif action=='monitor':
 p=Path('/content/haoyue-job.log');print(p.read_text()[-4000:] if p.exists() else 'No log')
 print(subprocess.check_output(['nvidia-smi','--query-gpu=name,utilization.gpu,memory.used','--format=csv,noheader'],timeout=10).decode())
elif action=='export':
 folder=root/'artifacts/haoyue-choice-v2';assert (folder/'evaluation.json').exists()
 (folder/'environment.txt').write_bytes(subprocess.check_output(['/content/haoyue-venv/bin/python','-m','pip','freeze'],timeout=30))
 manifest={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in folder.iterdir() if p.is_file() and p.name!='artifact-hashes.json'}
 (folder/'artifact-hashes.json').write_text(json.dumps(manifest,indent=2))
 shutil.make_archive('/content/haoyue-choice-v2','zip',folder);print('Artifact archive ready; download and verify before stopping runtime')
else:raise ValueError('Unknown action')
