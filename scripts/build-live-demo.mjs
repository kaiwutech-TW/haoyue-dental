/** Annotate genuine continuous browser video; no reconstructed operation frames. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require('../app/node_modules/sharp');
const root=new URL('../',import.meta.url).pathname;
const work=path.join(root,'artifacts/video-live/playwright'),docs=path.join(root,'docs/demo/live');
await fs.mkdir(docs,{recursive:true});await fs.mkdir(path.join(work,'overlays'),{recursive:true});
const recording=JSON.parse(await fs.readFile(path.join(work,'recording.json'),'utf8'));
if(!recording.passed)throw Error('Only a verified complete recording can be published.');
const scenes=JSON.parse(await fs.readFile(path.join(root,'docs/demo/notebooklm/scenes.json'),'utf8'));
const origin=recording.chapters[0].start,duration=recording.chapters.at(-1).end-origin;
if(duration>=179)throw Error('Recording exceeds three-minute safety margin. Do not speed up requests.');
const raw=path.join(work,'haoyue-live-raw.webm');
const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_format','-show_streams','-of','json',raw],{encoding:'utf8'}));
const cutError=Number(probe.format.duration)-recording.pageCloseAt;
if(Math.abs(cutError)>1.0)throw Error('Capture clock needs manual synchronization: '+cutError);
const trimStart=origin+cutError;
if(trimStart<0)throw Error('Capture starts after the intended first chapter.');
const probeDuration=file=>Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',file],{encoding:'utf8'}));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const text=(x,y,s,size=30,color='#254e40',weight=400)=>`<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(s)}</text>`;
const original=recording.responses.find(r=>r.action==='choose-fictional-patient').appointments[0];
const saved=recording.responses.find(r=>r.action==='explicit-confirm').appointments[0];
const rails=[
 ['Synthetic patient.', 'Real transaction.', 'Deployed web application', 'Recorded on the demonstration Mac'],
 ['Free text → intent', '8 administrative choices', 'NVIDIA 4B · LoRA / MLX', 'Scores still require safeguards'],
 ['Review. Confirm. Save.', `Stored v${original.version} → v${saved.version}`, 'Original kept until confirmation', 'Repeated request: no extra inference'],
 ['One step at a time', 'Guidance uses transparent rules', 'No age prediction', 'No trained emotion claim'],
 ['Human case opened', 'No staff reply yet', 'Appointment unchanged', 'Explicit request → safe handoff'],
 ['Small decisions.', 'Accountable actions.', 'Nebius: NVIDIA 30B fallback', 'Tavily: human-reviewed staff research', 'Supabase: atomic booking changes'],
 ['52 / 64 → 58 / 64', 'Author-written synthetic Mandarin test', '1 accepted prediction was wrong', '53 ms: warmed local median', 'Excludes network + database time'],
 ['Mandarin free text', 'English UI is interactive', 'Equivalent English accuracy unproven', 'Public code, adapter and recipe', 'haoyue-dental.vercel.app/en']
];
const time=v=>{let m=Math.round(v*1000);return `${String(Math.floor(m/3600000)).padStart(2,'0')}:${String(Math.floor(m/60000)%60).padStart(2,'0')}:${String(Math.floor(m/1000)%60).padStart(2,'0')},${String(m%1000).padStart(3,'0')}`;};
const timeline=[],srt=[],audioInputs=[];
for(let i=0;i<scenes.length;i++){
 const c=recording.chapters[i],scene=scenes[i],start=c.start-origin,end=c.end-origin;
 const audio=path.join(root,'artifacts/video-notebooklm/audio',scene.id+'.wav');
 const audioDuration=probeDuration(audio);
 if(audioDuration>end-start)throw Error('Narration does not fit the real footage: '+scene.id);
 audioInputs.push({path:audio,start,duration:audioDuration});
 const points=[{at:start,text:''},...scene.captions.map(cap=>({at:start+cap.start,text:cap.text})),{at:start+audioDuration,text:''}];
 for(let j=0;j<points.length;j++){
  const at=points[j].at,next=j+1<points.length?points[j+1].at:end;
  if(next-at<.001)continue;
  timeline.push({start:at,end:next,chapter:i,text:points[j].text});
  if(points[j].text)srt.push(`${srt.length+1}\n${time(at)} --> ${time(next)}\n${points[j].text}\n`);
 }
}
let concat=[];
for(let i=0;i<timeline.length;i++){
 const t=timeline[i],c=recording.chapters[t.chapter],lines=rails[t.chapter];
 let art='<rect width="1920" height="100" fill="#f7f6ee"/><rect x="1275" y="100" width="645" height="860" fill="#f7f6ee"/><rect y="958" width="1920" height="122" fill="#244d3e"/>';
 art+=text(45,32,'HAOYUE / NEBIUS × NVIDIA GLOBAL AI HACKATHON',17,'#61806b',600)+text(45,78,c.title,34,'#254e40',700);
 art+=text(1320,150,'GENUINE BROWSER RECORDING',18,'#61806b',700);
 for(let k=0;k<lines.length;k++)art+=text(1320,250+k*76,lines[k],k===0?36:25,'#254e40',k===0?700:400);
 art+=text(1320,820,'Normal speed · No mocked responses',22,'#61806b')+text(1320,865,'All appointments are synthetic.',22,'#61806b');
 if(t.text){const split=t.text.length>100?t.text.lastIndexOf(' ',Math.ceil(t.text.length/2)):-1;
  art+=split<0?text(45,1024,t.text,29,'white'):text(45,1003,t.text.slice(0,split),28,'white')+text(45,1045,t.text.slice(split+1),28,'white');
 }else art+=text(45,1024,'Actual input, request, response and stored results · Deployed service · Synthetic patients',25,'white');
 const file=path.join(work,'overlays',String(i).padStart(3,'0')+'.png');
 await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">${art}</svg>`)).png().toFile(file);
 concat.push(`file '${file}'\nduration ${(t.end-t.start).toFixed(6)}`);
}
concat.push(concat.at(-1).split('\n')[0]);
await fs.writeFile(path.join(work,'overlays.ffconcat'),concat.join('\n')+'\n');
await fs.writeFile(path.join(docs,'haoyue-live-en.srt'),srt.join('\n'));
const args=['-v','warning','-y','-ss',String(trimStart),'-i',raw,'-f','concat','-safe','0','-i',path.join(work,'overlays.ffconcat')];
for(const a of audioInputs)args.push('-i',a.path);
const techStart=recording.chapters[5].start-origin,techEnd=recording.chapters[6].end-origin;
let filters=[`[0:v]setpts=PTS-STARTPTS,crop=1160:810:220:'if(between(t,${techStart},${techEnd}),250,170)',scale=1200:838,pad=1920:1080:45:112:color=0xf7f6ee[real]`,
 '[real][1:v]overlay=0:0:shortest=0[v]'];
for(let i=0;i<audioInputs.length;i++)filters.push(`[${i+2}:a]aresample=48000,adelay=${Math.round(audioInputs[i].start*1000)}:all=1[a${i}]`);
filters.push(audioInputs.map((_,i)=>`[a${i}]`).join('')+`amix=inputs=${audioInputs.length}:normalize=0,loudnorm=I=-18:TP=-2:LRA=7,apad[a]`);
args.push('-filter_complex',filters.join(';'),'-map','[v]','-map','[a]','-r','25','-t',String(duration),'-c:v','libx264','-crf','20','-preset','fast','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart',path.join(work,'haoyue-live-en.mp4'));
execFileSync('ffmpeg',args,{stdio:'inherit'});
const hash=async p=>crypto.createHash('sha256').update(await fs.readFile(p)).digest('hex');
const result={createdAt:new Date().toISOString(),durationSeconds:duration,resolution:'1920x1080',
 source:{format:'Playwright native WebM video',viewport:recording.viewport,frameRate:probe.streams.find(s=>s.codec_type==='video').r_frame_rate,
 sha256:await hash(raw),clockDifferenceSeconds:cutError,trimStartSeconds:trimStart},
 editing:'One continuous normal-speed browser recording, trimmed before the first chapter. Same-timestamp viewport crop plus explanatory text. No operation frames reconstructed from screenshots.',
 narration:'Reviewed NotebookLM second generation reused; synthetic voice. Timed English SRT and burned captions.',
 outputSha256:await hash(path.join(work,'haoyue-live-en.mp4')),runtimeVerified:recording.passed,
 booking:{before:original,after:saved},chapters:recording.chapters.map(c=>({id:c.id,title:c.title,start:c.start-origin,end:c.end-origin})),
 published:false,organizerAcceptance:'not yet confirmed'};
await fs.writeFile(path.join(root,'reports/live-demo-video.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({duration,output:path.join(work,'haoyue-live-en.mp4')}));
