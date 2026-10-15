/** OpenAI Speech API narration. No browser/session credential reuse.
 * Official schema: https://developers.openai.com/api/docs/guides/text-to-speech
 * Usage: node scripts/generate-demo-speech.mjs --check
 *        node scripts/generate-demo-speech.mjs --scene 01-intro
 *        node scripts/generate-demo-speech.mjs --all
 */
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url).pathname;
try{process.loadEnvFile(root+'.env');}catch(e){if(e.code!=='ENOENT')throw e;}
const key=process.env.OPENAI_API_KEY;
const model='gpt-4o-mini-tts',voice='marin';
const instructions='Speak as a warm, confident product founder presenting to international hackathon judges. Be natural, engaged and clear, with a little smile and varied emphasis. Brisk, easy-to-follow delivery, about 170 words per minute. Short pauses between ideas. Never sound like a sales announcer or a monotone screen reader. Read the exact supplied script, without extra introductions, filler or music. HAOYUE is pronounced How Yue. NVIDIA is en-VID-ee-uh. Emphasize understand, confirm and complete.';
if(process.argv.includes('--check')){console.log(JSON.stringify({configured:!!key,model,voice,endpoint:'https://api.openai.com/v1/audio/speech',requestsMade:0}));process.exit(key?0:2);}
if(!key){console.error('OPENAI_API_KEY is missing. Add it to the ignored root .env; never paste it into chat. No request made.');process.exit(2);}
const scenes=JSON.parse(await fs.readFile(root+'docs/demo/scenes.json','utf8'));
const index=process.argv.indexOf('--scene');
const selected=process.argv.includes('--all')?scenes:scenes.filter(s=>s.id===process.argv[index+1]);
if(!selected.length||(!process.argv.includes('--all')&&index<0))throw Error('Choose --scene <id> or --all.');
const dir=root+'artifacts/video-openai/';await fs.mkdir(dir+'audio',{recursive:true});
let ledger={note:'Conservative local reservations, not a provider-enforced dollar cap or measured invoice. No automatic retries. Cached matching audio is reused.',reservedUsd:0,attempts:[]};
try{ledger=JSON.parse(await fs.readFile(dir+'usage.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
for(const scene of selected){
 if(scene.narration.length>950)throw Error('Unexpectedly long scene; review before spending.');
 const hash=crypto.createHash('sha256').update(JSON.stringify({model,voice,instructions,input:scene.narration,speed:1.04})).digest('hex');
 const output=dir+'audio/'+scene.id+'.wav',meta=output+'.json';
 try{const prior=JSON.parse(await fs.readFile(meta,'utf8'));if(prior.requestSha256===hash){await fs.access(output);console.log(JSON.stringify({scene:scene.id,cached:true,duration:prior.duration}));continue;}}catch(e){if(e.code!=='ENOENT')throw e;}
 if(ledger.reservedUsd+.03>.25+.000001)throw Error('Local $0.25 reservation ceiling reached; no further requests.');
 // Reserve before the call. Ambiguous failures are retained; never retry blindly.
 ledger.reservedUsd=Number((ledger.reservedUsd+.03).toFixed(2));
 const entry={scene:scene.id,requestSha256:hash,startedAt:new Date().toISOString(),status:'reserved'};
 ledger.attempts.push(entry);await fs.writeFile(dir+'usage.json',JSON.stringify(ledger,null,2)+'\n');
 let response;
 try{response=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model,voice,input:scene.narration,instructions,response_format:'wav',speed:1.04}),signal:AbortSignal.timeout(90000)});}catch(e){entry.status='network-failed-reservation-retained';await fs.writeFile(dir+'usage.json',JSON.stringify(ledger,null,2)+'\n');throw Error('Speech request failed; no automatic retry. '+e.name);}
 if(!response.ok){entry.status='http-'+response.status;await fs.writeFile(dir+'usage.json',JSON.stringify(ledger,null,2)+'\n');console.error(JSON.stringify({scene:scene.id,httpStatus:response.status,message:'No audio generated. Check OpenAI API access/billing. No automatic retry.'}));process.exit(1);}
 const contentType=response.headers.get('content-type')??'';
 if(!/audio|octet-stream/.test(contentType))throw Error('Unexpected response content type; refusing to save as audio.');
 const bytes=Buffer.from(await response.arrayBuffer());await fs.writeFile(output,bytes);
 const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',output],{encoding:'utf8'}).trim());
 if(!Number.isFinite(duration)||duration<1||duration>55)throw Error('Unexpected audio duration; review before continuing.');
 entry.status='generated';entry.duration=duration;entry.bytes=bytes.length;entry.requestId=response.headers.get('x-request-id');
 const metadata={provider:'OpenAI Speech API',model,voice,instructions,syntheticVoice:true,requestSha256:hash,audioSha256:crypto.createHash('sha256').update(bytes).digest('hex'),duration};
 await fs.writeFile(meta,JSON.stringify(metadata,null,2)+'\n');await fs.writeFile(dir+'usage.json',JSON.stringify(ledger,null,2)+'\n');
 console.log(JSON.stringify({scene:scene.id,generated:true,duration,bytes:bytes.length,reservedUsd:ledger.reservedUsd}));
}
