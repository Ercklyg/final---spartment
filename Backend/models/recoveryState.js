import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { HttpError } from '../middleware/errors.js';

export const recoveryKey=value=>createHash('sha256').update(value).digest('hex');
const unavailable=()=>new HttpError(503,'Password recovery storage is unavailable. Please retry.','recovery_storage_unavailable');
// Keep the app usable until the protected hosted function has been activated.
// Production/shared persistence is explicitly enabled only after deployment.
const localSessions=new Map(),localLimits=new Map();
function localState(action,key,payload){
  const now=Date.now();
  for(const [id,value] of localSessions)if(value.expiresAt<=now)localSessions.delete(id);
  for(const [id,value] of localLimits)if(Date.parse(value.expiresAt)<=now)localLimits.delete(id);
  if(action==='attempt'){
    const entry=localLimits.get(key)||{attempts:0,expiresAt:new Date(now+900000).toISOString()};
    entry.attempts++;localLimits.set(key,entry);return {allowed:entry.attempts<=3,expiresAt:entry.expiresAt};
  }
  if(action==='put'){localSessions.set(key,{...payload,busy:false});return {ok:true};}
  const entry=localSessions.get(key);
  if(action==='claim'){
    if(!entry)throw new HttpError(401,'This reset session has expired. Request a new link.');
    if(entry.busy)throw new HttpError(409,'Your password reset is already being processed. Please wait.');
    entry.busy=true;return {...entry};
  }
  if(action==='delete')localSessions.delete(key);
  if(action==='release'&&entry)entry.busy=false;
  return {ok:true};
}
function encryptionKey(){
  const key=Buffer.from(process.env.RECOVERY_ENCRYPTION_KEY||'','base64');
  if(key.length!==32)throw unavailable();return key;
}
export function encryptSession(key,session){
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encryptionKey(),iv);
  cipher.setAAD(Buffer.from(key));
  const encrypted=Buffer.concat([cipher.update(JSON.stringify(session),'utf8'),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64');
}
export function decryptSession(key,ciphertext){
  try{
    const bytes=Buffer.from(ciphertext,'base64');
    const decipher=createDecipheriv('aes-256-gcm',encryptionKey(),bytes.subarray(0,12));
    decipher.setAuthTag(bytes.subarray(12,28));decipher.setAAD(Buffer.from(key));
    return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8'));
  }catch{throw unavailable();}
}
export async function recoveryState(action,key,payload={}){
  if(process.env.RECOVERY_STORAGE_ENABLED!=='true')return localState(action,key,payload);
  if(!process.env.RECOVERY_STORAGE_SECRET)throw unavailable();
  let response,data;
  try{
    response=await fetch(new URL('/functions/v1/recovery-state',process.env.SUPABASE_URL),{method:'POST',headers:{apikey:process.env.SUPABASE_ANON_KEY,'Content-Type':'application/json','x-recovery-key':process.env.RECOVERY_STORAGE_SECRET},body:JSON.stringify({action,key,...payload}),signal:AbortSignal.timeout(10000)});
    data=await response.json();
  }catch{throw unavailable();}
  if(response.status===410)throw new HttpError(401,'This reset session has expired. Request a new link.');
  if(response.status===409)throw new HttpError(409,'Your password reset is already being processed. Please wait.');
  if(!response.ok)throw unavailable();return data;
}
