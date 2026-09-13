import { createUserClient } from '../config/supabase.js';
import { authFailure } from '../models/authErrors.js';
import { HttpError } from './errors.js';
import { readSessionCookie } from '../services/sessionCookies.js';
export async function authenticate(req,res,next) {
  const token=readSessionCookie(req,'access');
  if(!token)return res.status(401).json({error:'Sign in to continue.'});
  try{
    req.db=createUserClient(token);
    const {data,error}=await req.db.auth.getUser(token);
    if(error)throw authFailure(error);
    if(!data.user)throw new HttpError(401,'Invalid or expired session.');
    const expected=req.get('X-Spartment-User');
    if(expected&&expected!==data.user.id)throw new HttpError(409,'Your session changed. Refresh before trying again.','session_changed');
    req.user=data.user;
    const profile=await req.db.from('profiles').select('role').eq('id',data.user.id).maybeSingle();
    if(profile.error)throw new HttpError(503,'Authentication is temporarily unavailable. Please try again later.','auth_unavailable');
    if(!profile.data || !['admin','tenant'].includes(profile.data.role))return res.status(403).json({error:'Account role is unavailable.'});
    req.role=profile.data.role;next();
  }catch(error){next(error);}
}
export function requireAdmin(req,res,next){
  if(req.role!=='admin')return res.status(403).json({error:'Administrator access required.'});
  next();
}
