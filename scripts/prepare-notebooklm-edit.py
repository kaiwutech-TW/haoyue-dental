"""Reproduce the reviewed NotebookLM v2 edit from local downloaded audio/ASR.
The source voiceover is synthetic and only describes fictional patients.
Requires ffmpeg; generate transcription-v2.json with transcribe-demo.py first.
"""
from pathlib import Path
import json,subprocess,re,hashlib
root=Path(__file__).resolve().parents[1];work=root/'artifacts/video-notebooklm';docs=root/'docs/demo/notebooklm';docs.mkdir(parents=True,exist_ok=True);(work/'audio').mkdir(exist_ok=True)
audio=work/'narration-v2.m4a';asr=json.loads((work/'transcription-v2.json').read_text());scenes=json.loads((root/'docs/demo/scenes.json').read_text())
duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(audio)],text=True))
# Reviewed semantic boundaries from the v2 word timestamps, not invented timings.
bounds=[0,16.0,26.54,38.1,47.35,52.3,69.3,92.7,duration]
words=[w for s in asr['segments'] for w in s.get('words',[])]
def fix(s):
 s=re.sub(r'\bhow you\b','HAOYUE',s,flags=re.I)
 s=re.sub(r'\bsuper-based\b','Supabase',s,flags=re.I)
 s=s.replace('Tabbeli','Tavily').replace('Nebius token factory','Nebius Token Factory')
 return s.strip()
for i,scene in enumerate(scenes):
 start,end=bounds[i:i+2];selected=[w for w in words if start<=w['start']<end]
 text=fix(''.join(w['word'] for w in selected));scene['narration']=text
 scene['sourceStart']=start;scene['sourceEnd']=end
 chunks=[]
 for k in range(0,len(selected),14):
  group=selected[k:k+14]
  chunks.append({'text':fix(''.join(w['word'] for w in group)),'start':0 if k==0 else round(group[0]['start']-start,3)})
 scene['captions']=chunks
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(audio),'-ss',str(start),'-t',str(end-start),'-ar','48000','-ac','2',str(work/'audio'/f"{scene['id']}.wav")],check=True)
(docs/'scenes.json').write_text(json.dumps(scenes,ensure_ascii=False,indent=2)+'\n')
manifest={'provider':'NotebookLM / Gemini Notebook Audio Overview','format':'Brief; single English narrator','sourceAudioSha256':hashlib.sha256(audio.read_bytes()).hexdigest(),'sourceDurationSeconds':duration,'syntheticVoice':True,'claimsReviewed':True,'firstGenerationRejected':'Hyperbole and missing synthetic-data/network latency qualifications. Not published.','captionMethod':'Whisper word timestamps and reviewed semantic cuts; proper-name spelling corrected against source (HAOYUE, Supabase, Tavily). No changes to spoken meaning.','sourceBoundaries':bounds,'asrModel':'mlx-community/whisper-base.en-mlx','asrPackage':'mlx-whisper==0.4.3','asrSeconds':asr['elapsedSeconds'],'cloudApiRequestsForSpeech':0,'sourcePrivacy':'Only approved public narration was added to a new private notebook; no clinic workbooks or patient records.'}
(docs/'voice-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'audioDuration':duration,'chapters':len(scenes),'plannedVideoDuration':duration+.8*len(scenes),'words':len(words)}))
