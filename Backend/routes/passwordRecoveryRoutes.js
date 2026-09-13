import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as controller from '../controllers/passwordRecoveryController.js';
import { normalizeRecoveryEmail } from '../services/passwordRecoveryService.js';
import { recoveryKey, recoveryState } from '../models/recoveryState.js';

const router = Router();
const limit = (count, options = {}) => rateLimit({ windowMs: 15 * 60 * 1000, limit: count, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { error: 'Too many password reset attempts. Please try again in 15 minutes.' }, ...options });
const emailRequestLimit = async(req,res,next)=>{
  try{
    const result=await recoveryState('attempt',recoveryKey(normalizeRecoveryEmail(req.body)));
    if(result.allowed)return next();
    const seconds=Math.max(1,Math.ceil((Date.parse(result.expiresAt)-Date.now())/1000));
    const minutes=Math.ceil(seconds/60);
    res.set('Retry-After',String(seconds));
    res.status(429).json({error:`This email has reached the limit of 3 password reset requests. Try again in ${minutes} minute${minutes===1?'':'s'}.`});
  }catch(error){next(error);}
};
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.post('/forgot-password', emailRequestLimit, controller.requestReset);
router.post('/verify-recovery', limit(20), controller.verifyReset);
router.post('/reset-password', limit(20), controller.resetPassword);
export default router;
