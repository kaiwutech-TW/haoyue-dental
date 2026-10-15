import {localize} from '@/lib/dental/language';
import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {transact,read} from '@/lib/dental/store';
import {createSession,getSession,propose,confirm,view,patients} from '@/lib/dental/domain';
import {chat} from '@/lib/dental/service';
import {checkOrigin} from '@/lib/dental/access';
import {sourceId,admitRequest,LimitError} from '@/lib/dental/budget';
import {mode,MODEL} from '@/lib/dental/model';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function storeLabel(){return process.env.SUPABASE_URL?'Supabase':'SQLite';}
export async function GET(req:NextRequest){const id=req.cookies.get(req.nextUrl.searchParams.get('locale')==='en'?'haoyue_session_en':'haoyue_session')?.value;try{return NextResponse.json({storage:storeLabel(),serverRegion:process.env.VERCEL_REGION??'local',data:id?await read(c=>view(c,id)):null,patients,mode:mode(),model:mode()==='rule'?'規則基準（未使用模型）':mode()==='hybrid'?'NVIDIA 4B LoRA with Nebius fallback':MODEL},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({storage:storeLabel(),serverRegion:process.env.VERCEL_REGION??'local',data:null,patients,mode:mode()});}}
const input=z.discriminatedUnion('action',[z.object({action:z.literal('start'),patient:z.enum(['lin','wu']),locale:z.enum(['zh','en']).optional()}),z.object({action:z.literal('message'),text:z.string().trim().min(1).max(1500)}),z.object({action:z.literal('select'),doctor:z.string(),slot:z.string()}),z.object({action:z.literal('confirm'),proposalId:z.string().uuid()}),z.object({action:z.literal('appointment'),appointmentId:z.string()})]);
export async function POST(req:NextRequest){try{checkOrigin(req);if(Number(req.headers.get('content-length')??0)>6000)throw Error('訊息太長');const raw=await req.text();if(new TextEncoder().encode(raw).length>6000)throw Error('訊息太長');const body=input.parse(JSON.parse(raw));let id=req.cookies.get(req.nextUrl.searchParams.get('locale')==='en'?'haoyue_session_en':'haoyue_session')?.value;const source=sourceId(req);await transact(c=>admitRequest(c,source,body.action));
 if(body.action==='start'){id=await transact(c=>{if(Object.keys(c.sessions).length>=1000)throw Error('示範容量已滿');return createSession(c,body.patient,req.nextUrl.searchParams.get('locale')==='en'?'en':'zh');});const res=NextResponse.json({storage:storeLabel(),serverRegion:process.env.VERCEL_REGION??'local',data:await read(c=>view(c,id!))});res.cookies.set(req.nextUrl.searchParams.get('locale')==='en'?'haoyue_session_en':'haoyue_session',id,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:86400});return res;}
 if(!id)throw Error('請先選擇示範患者');let data;
 if(body.action==='message')data=await chat(id,body.text,source);
 else data=await transact(c=>{const s=getSession(c,id!);if(body.action==='select')propose(c,s,{doctor:body.doctor,slot:body.slot});if(body.action==='confirm')confirm(c,id!,body.proposalId);if(body.action==='appointment'){if(!c.appointments.some(a=>a.id===body.appointmentId&&a.patient===s.patient&&a.status==='booked'))throw Error('無效的預約');s.appointmentId=body.appointmentId;}return view(c,id!);});return NextResponse.json({storage:storeLabel(),serverRegion:process.env.VERCEL_REGION??'local',data});
 }catch(e){return NextResponse.json({error:localize(e instanceof z.ZodError?'輸入格式不正確':e instanceof Error?e.message:'暫時無法處理',req.nextUrl.searchParams.get('locale')==='en'?'en':'zh')},{status:e instanceof LimitError?429:400});}}
