import {NextResponse} from 'next/server';
import {z} from 'zod';
import {transact,read} from '@/lib/dental/store';
import {staffReply,publicDesk} from '@/lib/dental/service';
import {pauseModels} from '@/lib/dental/budget';
import {admin,checkOrigin} from '@/lib/dental/access';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(req:Request){try{admin(req);return NextResponse.json(await read(publicDesk));}catch{return NextResponse.json({error:'需要管理員登入'},{status:401});}}
const schema=z.discriminatedUnion('action',[z.object({action:z.literal('pause_models')}),z.object({action:z.literal('reply'),sessionId:z.string(),text:z.string().trim().min(1).max(1500)}),z.object({action:z.literal('research'),query:z.string().trim().min(2).max(200)}),z.object({action:z.literal('approve'),id:z.string(),question:z.string().trim().min(2).max(200),answer:z.string().trim().min(2).max(1500)})]);
export async function POST(req:Request){try{admin(req);checkOrigin(req);const b=schema.parse(await req.json());if(b.action==='pause_models')await transact(pauseModels);if(b.action==='reply')await transact(c=>staffReply(c,b.sessionId,b.text));
 if(b.action==='approve')await transact(c=>{const k=c.knowledge.find(k=>k.id===b.id);if(!k)throw Error('來源不存在');k.question=b.question;k.answer=b.answer;k.approved=true;});
 if(b.action==='research'){
  if(!process.env.TAVILY_API_KEY)throw Error('Tavily 尚未設定');
  const r=await fetch('https://api.tavily.com/search',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.TAVILY_API_KEY}`},body:JSON.stringify({query:b.query,search_depth:'basic',max_results:3,include_answer:false}),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('研究服務暫時不可用');const result=await r.json();await transact(c=>{for(const x of result.results??[]){const url=new URL(x.url);if(url.protocol!=='https:')continue;c.knowledge.push({id:crypto.randomUUID(),question:String(x.title).slice(0,200),answer:String(x.content).slice(0,1500),source:url.href,approved:false});}});
 }
 return NextResponse.json(await read(publicDesk));}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'操作失敗'},{status:400});}}
