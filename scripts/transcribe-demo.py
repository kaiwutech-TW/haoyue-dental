"""Local speech QA; does not call a cloud API or change concierge inference env.
Install in a separate venv: uv pip install --python .venv-narration/bin/python mlx-whisper==0.4.3
Usage: .venv-narration/bin/python scripts/transcribe-demo.py AUDIO OUTPUT.json
"""
from pathlib import Path
import json,sys,time
import mlx_whisper
if len(sys.argv)!=3:raise SystemExit('Expected AUDIO OUTPUT.json')
started=time.monotonic()
r=mlx_whisper.transcribe(sys.argv[1],path_or_hf_repo='mlx-community/whisper-base.en-mlx',language='en',word_timestamps=True,verbose=False)
r['qaNote']='Automated ASR for caption alignment and review. Proper names may be mistranscribed; compare with actual speech and approved claims.'
r['elapsedSeconds']=time.monotonic()-started
out=Path(sys.argv[2]);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'output':str(out),'elapsedSeconds':r['elapsedSeconds'],'text':r['text']}))
