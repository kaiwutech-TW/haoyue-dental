import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { seed, type Clinic } from './domain.ts';
const path=process.env.CLINIC_DB_PATH??resolve(process.cwd(),'.data/clinic.sqlite');
let db:DatabaseSync|undefined;
function local(){if(!db){mkdirSync(dirname(path),{recursive:true});db=new DatabaseSync(path);db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS clinic (id INTEGER PRIMARY KEY CHECK(id=1), body TEXT NOT NULL);');db.prepare('INSERT OR IGNORE INTO clinic VALUES(1,?)').run(JSON.stringify(seed()));}return db;}
async function remote(name:string,args:object){const response=await fetch(`${process.env.SUPABASE_URL}/functions/v1/clinic-store`,{method:'POST',headers:{'Content-Type':'application/json','x-clinic-secret':process.env.CLINIC_STORE_SECRET!},body:JSON.stringify({op:name,...args}),cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('資料服務暫時無法使用');return response.json();}
export async function transact<T>(mutate:(c:Clinic)=>T):Promise<T>{
 if(process.env.SUPABASE_URL){for(let attempt=0;attempt<8;attempt++){const row=await remote('haoyue_read',{});const c:Clinic=row.body??seed();const result=mutate(c);if(await remote('haoyue_cas',{p_revision:row.revision,p_body:c}))return result;}throw Error('系統忙碌，請再試一次');}
 const d=local();d.exec('BEGIN IMMEDIATE');try{const row=d.prepare('SELECT body FROM clinic WHERE id=1').get() as {body:string};const c=JSON.parse(row.body) as Clinic;const result=mutate(c);d.prepare('UPDATE clinic SET body=? WHERE id=1').run(JSON.stringify(c));d.exec('COMMIT');return result;}catch(e){d.exec('ROLLBACK');throw e;}
}
export async function read<T>(get:(c:Clinic)=>T):Promise<T>{if(process.env.SUPABASE_URL){const row=await remote('haoyue_read',{});return get(row.body??seed());}const row=local().prepare('SELECT body FROM clinic WHERE id=1').get() as {body:string};return get(JSON.parse(row.body));}
