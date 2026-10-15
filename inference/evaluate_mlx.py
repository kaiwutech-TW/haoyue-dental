import json,statistics,platform
from pathlib import Path
import mlx.core as mx
from inference.choice import ChoiceModel
m=ChoiceModel();rows=[json.loads(x) for x in Path('data/v2/test.jsonl').read_text().splitlines()]
reference=json.loads(Path('reports/nvidia4b-choice-v2.json').read_text())['trainedCalibrated']['predictions']
m.predict('我要改期')
preds=[dict(m.predict(r['text']),text=r['text'],expected=r['intent']) for r in rows]
agreement=sum(p['intent']==r['predicted'] for p,r in zip(preds,reference))
report={'runtime':'MLX / Apple silicon','machine':platform.machine(),'baseModel':m.config['baseModel'],'revision':m.config['revision'],'adapterSha256':m.adapter_hash,'n':len(rows),'correct':sum(p['intent']==p['expected'] for p in preds),'cudaIntentAgreement':agreement,'maxProbabilityDifference':max(abs(p['probabilities'][k]-r['probabilities'][k]) for p,r in zip(preds,reference) for k in m.config['intents']),'accepted':sum(not p['abstain'] for p in preds),'acceptedErrors':sum(not p['abstain'] and p['intent']!=p['expected'] for p in preds),'medianLatencyMs':statistics.median(p['latencyMs'] for p in preds),'peakMemoryBytes':mx.get_peak_memory(),'limitations':'Re-evaluation of the already inspected v2 synthetic test for runtime parity; not a new generalization test. Timing excludes network and includes tokenization.','predictions':preds}
Path('reports/mlx-choice-v2.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='predictions'},ensure_ascii=False))
