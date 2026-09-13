import { HttpError } from '../middleware/errors.js';

const secure=()=>process.env.NODE_ENV==='production'||process.env.COOKIE_SECURE==='true';
const name=kind=>(secure()?'__Host-':'')+'spartment-'+kind;
const options=()=>({httpOnly:true,secure:secure(),sameSite:'lax',path:'/'});
export function readSessionCookie(req,kind) {
  const entries=(req.headers.cookie||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(name(kind)+'='));
  if(entries.length!==1)return null;
  try { const value=decodeURIComponent(entries[0].slice(name(kind).length+1));return value.length<=3800?value:null; }catch{return null;}
}
export function setSessionCookies(res,session) {
  if(!session?.access_token||!session?.refresh_token||!session?.user?.id
    ||session.access_token.length>3800||session.refresh_token.length>3800)throw new HttpError(503,'Unable to establish a session.','auth_unavailable');
  res.cookie(name('access'),session.access_token,{...options(),maxAge:Math.max(0,session.expires_at*1000-Date.now())});
  res.cookie(name('refresh'),session.refresh_token,{...options(),maxAge:14*24*60*60*1000});
  res.set('Cache-Control','no-store');
}
export function clearSessionCookies(res) {
  for(const kind of ['access','refresh'])res.clearCookie(name(kind),options());
}
export const publicSession=session=>({user:{id:session.user.id,email:session.user.email},expires_at:session.expires_at});
