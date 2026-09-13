import { createHmac } from 'node:crypto';
import { ipKeyGenerator } from 'express-rate-limit';
import { HttpError } from './errors.js';
import { email } from '../services/validation.js';

export async function loginLimit(req,res,next) {
  try {
    const account=email(req.user?.email??req.body?.email);
    if(!req.user&&(typeof req.body?.password!=='string'||!req.body.password||req.body.password.length>128))throw new HttpError(400,'Email and password are required.');
    if(!process.env.RECOVERY_STORAGE_SECRET)throw new HttpError(503,'Authentication is temporarily unavailable.','auth_unavailable');
    const hash=value=>createHmac('sha256',process.env.RECOVERY_STORAGE_SECRET).update(value).digest('hex');
    const response=await fetch(new URL('/functions/v1/recovery-state',process.env.SUPABASE_URL),{
      method:'POST',headers:{'Content-Type':'application/json',apikey:process.env.SUPABASE_ANON_KEY,'x-recovery-key':process.env.RECOVERY_STORAGE_SECRET},
      body:JSON.stringify({action:'login-attempt',key:hash('account:'+account),ipKey:hash('ip:'+ipKeyGenerator(req.ip))}),signal:AbortSignal.timeout(10000),
    });
    if(!response.ok)throw new HttpError(503,'Authentication is temporarily unavailable.','auth_unavailable');
    const result=await response.json();
    if(result.allowed!==true){
      const seconds=Math.max(1,Number(result.retryAfter)||900);
      res.set('Retry-After',String(seconds));
      throw new HttpError(429,`Too many sign-in attempts. Try again in ${Math.ceil(seconds/60)} minutes.`,'login_limited');
    }
    next();
  }catch(error){next(error instanceof HttpError?error:new HttpError(503,'Authentication is temporarily unavailable.','auth_unavailable'));}
}
