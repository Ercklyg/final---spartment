import { HttpError } from './errors.js';

export const allowedOrigins=()=>new Set((process.env.FRONTEND_ORIGIN||'http://localhost:5173,http://127.0.0.1:5173').split(',').map(s=>s.trim()));
export function browserSecurity(req,res,next) {
  res.set('Cache-Control','no-store');
  if(['GET','HEAD','OPTIONS'].includes(req.method))return next();
  // CORS controls reads; these checks reject cross-site writes before execution.
  if(!allowedOrigins().has(req.get('Origin'))||req.get('X-Spartment-Request')!=='1')
    return next(new HttpError(403,'Untrusted request origin. Reload the application and retry.','csrf_rejected'));
  if(!req.is('application/json'))return next(new HttpError(415,'Send a JSON request.'));
  next();
}
