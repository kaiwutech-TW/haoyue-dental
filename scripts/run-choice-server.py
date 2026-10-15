"""Load only the adapter key, never the provider keys, into the local service."""
import os
from pathlib import Path
root=Path(__file__).resolve().parents[1]
for line in (root/'.env').read_text().splitlines():
 if line.startswith('DECISION_ADAPTER_KEY='):os.environ['DECISION_ADAPTER_KEY']=line.split('=',1)[1].strip().strip('"').strip("'")
os.chdir(root)
os.execv(str(root/'.venv-mlx/bin/python'),['python','-m','uvicorn','inference.server:app','--host','127.0.0.1','--port','8766','--no-access-log'])
