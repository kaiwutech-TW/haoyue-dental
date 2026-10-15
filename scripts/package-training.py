from pathlib import Path
import zipfile,hashlib
out=Path('artifacts/training-input.zip');out.parent.mkdir(exist_ok=True)
files=sorted([*Path('training').glob('*.py'),*Path('training').glob('*.sh'),Path('training/requirements.txt'),*Path('data').glob('*.jsonl'),*Path('data/v2').glob('*.jsonl'),Path('data/v2/manifest.json')])
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
 for p in files:z.write(p,str(p))
print(out,hashlib.sha256(out.read_bytes()).hexdigest())
