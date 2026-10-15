import {SECRET_HASH} from './secret-hash.ts';
Deno.serve(async(req:Request)=>{
 const secret=req.headers.get('x-clinic-secret')??'';
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret)))).map(b=>b.toString(16).padStart(2,'0')).join('');
 if(digest!==SECRET_HASH)return Response.json({error:'Unauthorized'},{status:401});
 if(req.method!=='POST')return new Response(null,{status:405});
 try {
  const text=await req.text();if(text.length>3000000)return new Response(null,{status:413});
  const b=JSON.parse(text),url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
  if(b.op==='haoyue_read'){const r=await fetch(url+'/rest/v1/clinic_state?id=eq.1&select=revision,body',{headers});if(!r.ok)throw Error();const rows=await r.json();return Response.json(rows[0]);}
  if(b.op==='haoyue_cas'&&Number.isSafeInteger(b.p_revision)&&b.p_body&&typeof b.p_body==='object'){
   const r=await fetch(url+'/rest/v1/rpc/haoyue_cas',{method:'POST',headers,body:JSON.stringify({p_revision:b.p_revision,p_body:b.p_body})});if(!r.ok)throw Error();return Response.json(await r.json());
  }return Response.json({error:'Invalid request'},{status:400});
 }catch{return Response.json({error:'Storage unavailable'},{status:503});}
});
