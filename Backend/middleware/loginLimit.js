import { createHmac } from 'node:crypto';
import { ipKeyGenerator } from 'express-rate-limit';
import { HttpError } from './errors.js';
import { email } from '../services/validation.js';

const keys=req=>{
  const account=email(req.user?.email??req.body?.email);
  if(!process.env.RECOVERY_STORAGE_SECRET)throw new HttpError(503,'Authentication is temporarily unavailable.','auth_unavailable');
  const hash=value=>createHmac('sha256',process.env.RECOVERY_STORAGE_SECRET).update(value).digest('hex');
  return {key:hash('account:'+account),ipKey:hash('ip:'+ipKeyGenerator(req.ip))};
};

export async function updateLoginLimit(req,action) {
  try {
    const response=await fetch(new URL('/functions/v1/recovery-state',process.env.SUPABASE_URL),{
      method:'POST',headers:{'Content-Type':'application/json',apikey:process.env.SUPABASE_ANON_KEY,'x-recovery-key':process.env.RECOVERY_STORAGE_SECRET},
      body:JSON.stringify({action,...keys(req)}),signal:AbortSignal.timeout(10000),
    });
    if(!response.ok)throw new HttpError(503,'Authentication is temporarily unavailable.','auth_unavailable');
    const result=await response.json();
    if(result.allowed!==true){
      const seconds=Math.max(1,Number(result.retryAfter)||900);
      const error=new HttpError(429,`Too many sign-in attempts. Try again in ${Math.ceil(seconds/60)} minutes.`,'login_limited');
      error.retryAfter=seconds;
      throw error;
    }
    return result;
  }catch(error){throw error instanceof HttpError?error:new HttpError(503,'Authentication is temporarily unavailable.','auth_unavailable');}
}

// A missing count comes from an older limiter response; keep clearing in that case.
export const loginNeedsSuccessClear=req=>req.loginLimit?.accountAttempts!==0;

export async function loginLimit(req,res,next) {
  try {
    if(!req.user&&(typeof req.body?.password!=='string'||!req.body.password||req.body.password.length>128))throw new HttpError(400,'Email and password are required.');
    req.loginLimit=await updateLoginLimit(req,'login-check');
    next();
  }catch(error){if(error.retryAfter)res.set('Retry-After',String(error.retryAfter));next(error);}
}
