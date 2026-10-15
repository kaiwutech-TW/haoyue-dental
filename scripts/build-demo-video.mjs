/** Reproducible demo edit: actual CUA window captures, local synthetic narration.
 * Raw captures/audio stay in ignored artifacts/video; never export browser chrome.
 * Requires macOS say/Samantha, ffmpeg, and app/node_modules/sharp.
 */
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require('../app/node_modules/sharp');
const root=new URL('../',import.meta.url).pathname;
const useOpenAI=process.argv.includes('--openai');
const useNotebookLM=process.argv.includes('--notebooklm');
if(useOpenAI&&useNotebookLM)throw Error('Choose one narration provider.');
const externalVoice=useOpenAI||useNotebookLM;
const work=root+(useNotebookLM?'artifacts/video-notebooklm/':useOpenAI?'artifacts/video-openai/':'artifacts/video/');
const source=root+'artifacts/video/source/';
const docs=root+(useNotebookLM?'docs/demo/notebooklm/':'docs/demo/');
await fs.mkdir(work+'frames',{recursive:true});
await fs.mkdir(work+'audio',{recursive:true});
await fs.mkdir(docs,{recursive:true});
const scenes=JSON.parse(await fs.readFile(docs+'scenes.json','utf8'));
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const text=(x,y,s,size=30,color='#254e40',weight=400)=>`<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(s)}</text>`;
const svg=s=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">${s}</svg>`);
const base=(scene,i)=>`<rect width="1920" height="1080" fill="#f7f6ee"/><rect x="0" y="0" width="12" height="1080" fill="#8cb55e"/>${text(60,44,'HAOYUE  /  NEBIUS × NVIDIA GLOBAL AI HACKATHON',19,'#61806b',600)}${text(60,101,scene.title,40,'#254e40',700)}${text(1815,56,String(i+1).padStart(2,'0')+' / 08',19,'#61806b')}`;
async function crop(name,box,w,h){return sharp(source+name+'.png').extract(box).resize(w,h,{fit:'contain',background:'#f7f6ee'}).png().toBuffer();}
async function actual(name){ // crop only real web content, omit all browser chrome
 return [{input:await crop(name,{left:750,top:600,width:850,height:1350},490,778),left:100,top:155},
 {input:await crop(name,{left:1700,top:600,width:1350,height:1350},778,778),left:650,top:155}];
}
const ss=s=>s.split(/(?<=[.!?])\s+/).flatMap(sentence=>{let words=sentence.trim().split(/\s+/),chunks=[];while(words.length)chunks.push(words.splice(0,16).join(' '));return chunks;});
const time=v=>{let ms=Math.round(v*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;};
let list=[],audios=[],srt=[],globalTime=0,frameNo=0;
for(let i=0;i<scenes.length;i++){
 const scene=scenes[i],audio=work+'audio/'+scene.id+(externalVoice?'.wav':'.aiff');
 if(externalVoice){try{await fs.access(audio);}catch{throw Error('Generate every external audio scene first: '+scene.id);}}
 try{await fs.access(audio);}catch{const txt=work+'audio/'+scene.id+'.txt';await fs.writeFile(txt,scene.narration);execFileSync('/usr/bin/say',['-v','Samantha','-r','172','-f',txt,'-o',audio]);}
 const duration=Number(execFileSync('ffprobe',['-v','quiet','-show_entries','format=duration','-of','csv=p=0',audio],{encoding:'utf8'}).trim());
 scene.audioDuration=duration; const total=duration+.8;
 const padded=work+'audio/'+scene.id+'.normalized.wav';
 execFileSync('ffmpeg',['-v','error','-y','-i',audio,'-af','loudnorm=I=-18:TP=-2:LRA=7,apad','-t',String(total),'-ar','48000','-ac','2',padded]); audios.push(`file '${padded}'`);
 const chunks=scene.captions?scene.captions.map(p=>p.text):ss(scene.narration),words=chunks.map(s=>s.split(/\s+/).length),wordTotal=words.reduce((a,b)=>a+b,0);let elapsed=0;
 for(let j=0;j<chunks.length;j++){
  const part=(scene.captions?(j+1<chunks.length?scene.captions[j+1].start:duration)-elapsed:duration*words[j]/wordTotal)+(j===chunks.length-1?.8:0),progress=(elapsed+part/2)/total;
  if(!(part>0))throw Error('Caption boundaries must increase.');
  let artwork=[],extra='';
  if(i===0){artwork=[{input:await sharp(root+'docs/assets/haoyue-cover.png').resize(960,640,{fit:'contain'}).png().toBuffer(),left:60,top:210}]; extra=text(1080,310,'Understand.',62,undefined,700)+text(1080,390,'Confirm.',62,undefined,700)+text(1080,470,'Complete.',62,undefined,700)+text(1080,580,'Taiwanese dental conversations',29)+text(1080,625,'meet inspectable decisions.',29)+text(1080,750,'Real product captures · Synthetic patients',21,'#61806b')+text(1080,790,'Synthetic English narration',21,'#61806b');}
  if(i===1){artwork=await actual('02-intent');extra=text(1475,270,'8 intents',44,undefined,700)+text(1475,320,'1 forward pass',30)+text(1475,430,'Actual model scores',26)+text(1475,475,'Actual adapter hash',26)+text(1475,610,'94.3% ≠ accuracy',27,undefined,700)+text(1475,655,'Confirmation still required',23)+text(1475,785,'Live request: 1.55 s',24)+text(1475,822,'Local cold pass: 905 ms',23);}
  if(i===2){artwork=await actual(progress<.48?'03-proposal':'05-committed');extra=text(1475,270,progress<.48?'Before confirmation':'After confirmation',27,undefined,700)+text(1475,335,progress<.48?'Original kept':'Saved result',39,undefined,700)+text(1475,410,progress<.48?'Version 10':'Version 11',29)+text(1475,530,'Ownership',26)+text(1475,580,'Availability',26)+text(1475,630,'Expiry + version',26)+text(1475,740,'Atomic transaction',26,undefined,700)+text(1475,790,'Conflict → keep original',24);}
  if(i===3){artwork=await actual(progress<.42?'04-repeat':'06-guidance');extra=text(1475,280,progress<.42?'Repeated request':'Explicit confusion',29,undefined,700)+text(1475,400,'No extra inference',28)+text(1475,460,'Keep pending choices',26)+text(1475,560,'One step at a time',26)+text(1475,700,'Transparent style rules',26,undefined,700)+text(1475,750,'No age prediction',24)+text(1475,793,'No emotion-model claim',24);}
  if(i===4){artwork=await actual('07-handoff');extra=text(1475,290,'Case opened',42,undefined,700)+text(1475,400,'Appointment unchanged',25)+text(1475,480,'No fake staff response',25)+text(1475,590,'Human request',26)+text(1475,640,'Symptoms',26)+text(1475,690,'Family bookings',26);}
  if(i===5){artwork=[{input:await sharp(root+'docs/assets/architecture.png').resize(1180,786,{fit:'contain'}).png().toBuffer(),left:45,top:140}];extra=text(1280,250,'Specialize small.',42,undefined,700)+text(1280,310,'Escalate when needed.',36,undefined,700)+text(1280,435,'NVIDIA 4B · LoRA / MLX',27)+text(1280,495,'Nebius · NVIDIA 30B',27)+text(1280,555,'Supabase · atomic writes',27)+text(1280,615,'Tavily · reviewed research',27)+text(1280,745,'Hosted fallback is budgeted.',25)+text(1280,790,'Custom adapter runs on Mac.',25);}
  if(i===6){extra=text(80,235,'FIXED SYNTHETIC TEST / 64 ITEMS',23,'#61806b',700)+text(80,340,'52 → 58',102,undefined,700)+text(80,395,'Correct: base → LoRA',32)+text(80,510,'1 accepted prediction was still wrong',31,undefined,700)+text(80,560,'54 accepted at score ≥ 0.85',28)+text(80,660,'Author-written Mandarin examples.',27)+text(80,705,'Not clinical validation; English parity unproven.',27)+text(1120,255,'53 ms',94,undefined,700)+text(1120,310,'Warmed local Mac median',29)+text(1120,355,'Excludes network + database',26)+text(1120,515,'127 s',94,undefined,700)+text(1120,570,'L4 training + evaluation segment',28)+text(1120,705,'64 / 64 CUDA → MLX intent parity',26)+text(1120,760,'397,312 trainable LoRA parameters',26);}
  if(i===7){artwork=[{input:await crop('08-chinese',{left:750,top:600,width:2310,height:1350},1120,655),left:40,top:200}];extra=text(1220,270,'Try HAOYUE',54,undefined,700)+text(1220,350,'haoyue-dental.vercel.app/en',27)+text(1220,450,'Mandarin + English demos',27)+text(1220,510,'Public code + adapter',27)+text(1220,570,'Training recipe + failures',27)+text(1220,630,'Measured time + costs',27)+text(1220,780,'Understand. Confirm. Complete.',28,undefined,700);}
  // Captions rendered with SVG for portable ffmpeg builds without libass.
  const line=chunks[j],split=line.length>98?line.lastIndexOf(' ',Math.ceil(line.length/2)):-1;
  const cap=split<0?text(70,1005,line,31,'#fff'):text(70,985,line.slice(0,split),30,'#fff')+text(70,1028,line.slice(split+1),30,'#fff');
  const overlay=svg(extra+'<rect x="0" y="950" width="1920" height="130" fill="#244d3e"/>'+cap);
  const file=work+'frames/'+String(frameNo++).padStart(3,'0')+'.png';
  await sharp(svg(base(scene,i))).composite([...artwork,{input:overlay,left:0,top:0}]).png().toFile(file);
  list.push(`file '${file}'\nduration ${part.toFixed(6)}`);
  srt.push(`${srt.length+1}\n${time(globalTime+elapsed)} --> ${time(globalTime+elapsed+part)}\n${line}\n`);
  elapsed+=part;
 }
 globalTime+=total;
}
if(globalTime>=179)throw Error('Narration exceeds the safe three-minute edit limit. Review pacing before publishing.');
list.push(list.at(-1).split('\n')[0]);
await fs.writeFile(work+'frames.txt',list.join('\n')+'\n'); await fs.writeFile(work+'audio.txt',audios.join('\n')+'\n');
await fs.writeFile(docs+'haoyue-demo-en.srt',srt.join('\n'));
await fs.writeFile(docs+'transcript.md',scenes.map(s=>`## ${s.title}\n\n${s.narration}\n`).join('\n'));
execFileSync('ffmpeg',['-v','error','-y','-f','concat','-safe','0','-i',work+'audio.txt','-c:a','pcm_s16le',work+'narration.wav']);
execFileSync('ffmpeg',['-v','warning','-y','-f','concat','-safe','0','-i',work+'frames.txt','-i',work+'narration.wav','-r','30','-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-t',String(globalTime),'-movflags','+faststart',work+'haoyue-demo-en.mp4'],{stdio:'inherit'});
console.log(JSON.stringify({duration:globalTime,frames:frameNo,voice:useNotebookLM?'NotebookLM':useOpenAI?'OpenAI marin':'Samantha',output:work+'haoyue-demo-en.mp4'}));
