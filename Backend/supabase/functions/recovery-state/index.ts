import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async req=>{
  const expected=Deno.env.get('RECOVERY_STORAGE_SECRET');
  const supplied=req.headers.get('x-recovery-key');
  if(!expected||!supplied)return reply(401,{error:'Unauthorized'});
  const digest=async(value:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
  const [a,b]=await Promise.all([digest(expected),digest(supplied)]);
  let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];
  if(difference)return reply(401,{error:'Unauthorized'});
  if(req.method!=='POST')return reply(405,{error:'Method not allowed'});
  try{
    const raw=await req.text();if(raw.length>32768)return reply(413,{error:'Request too large'});
    const body=JSON.parse(raw);
    if(typeof body?.key!=='string'||!/^[a-f0-9]{64}$/.test(body.key))return reply(400,{error:'Invalid key'});
    const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
    const now=new Date().toISOString();
    if(body.action==='login-attempt'){
      if(typeof body.ipKey!=='string'||!/^[a-f0-9]{64}$/.test(body.ipKey))return reply(400,{error:'Invalid limit key'});
      const {data,error}=await db.rpc('consume_login_attempt',{p_account_hash:body.key,p_ip_hash:body.ipKey});
      return error?reply(503,{error:'Storage unavailable'}):reply(200,data);
    }
    if(body.action==='attempt'){
      const {data,error}=await db.rpc('consume_password_recovery_attempt',{p_email_hash:body.key});
      return error?reply(503,{error:'Storage unavailable'}):reply(200,data);
    }
    if(body.action==='put'){
      if(typeof body.ciphertext!=='string'||body.ciphertext.length>20000||typeof body.userId!=='string'||!/^[0-9a-f-]{36}$/i.test(body.userId)
        ||!Number.isFinite(body.expiresAt)||body.expiresAt<=Date.now()||body.expiresAt>Date.now()+610000)return reply(400,{error:'Invalid session'});
      const cleanup=await db.from('password_recovery_sessions').delete().lte('expires_at',now);
      if(cleanup.error)return reply(503,{error:'Storage unavailable'});
      const {error}=await db.from('password_recovery_sessions').insert({ticket_hash:body.key,encrypted_session:body.ciphertext,user_id:body.userId,expires_at:new Date(body.expiresAt).toISOString()});
      return error?reply(503,{error:'Storage unavailable'}):reply(200,{ok:true});
    }
    if(body.action==='claim'){
      const {data,error}=await db.from('password_recovery_sessions').update({busy:true}).eq('ticket_hash',body.key).eq('busy',false).gt('expires_at',now).select('encrypted_session,user_id,expires_at').maybeSingle();
      if(error)return reply(503,{error:'Storage unavailable'});
      if(data)return reply(200,{ciphertext:data.encrypted_session,userId:data.user_id,expiresAt:Date.parse(data.expires_at)});
      const existing=await db.from('password_recovery_sessions').select('busy').eq('ticket_hash',body.key).gt('expires_at',now).maybeSingle();
      if(existing.error)return reply(503,{error:'Storage unavailable'});
      return existing.data?reply(409,{error:'Reset already being processed'}):reply(410,{error:'Reset expired'});
    }
    if(body.action==='delete'||body.action==='release'){
      const query=body.action==='delete'?db.from('password_recovery_sessions').delete():db.from('password_recovery_sessions').update({busy:false});
      const {error}=await query.eq('ticket_hash',body.key);
      return error?reply(503,{error:'Storage unavailable'}):reply(200,{ok:true});
    }
    return reply(400,{error:'Unknown operation'});
  }catch{return reply(503,{error:'Storage unavailable'});}
});
