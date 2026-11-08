import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.js';
import { emailChange } from '../services/emailChangeService.js';
import { clearSessionCookies } from '../services/sessionCookies.js';

const router = Router();
router.use(rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a minute.' } }));
// Approval is a bearer capability from the OLD mailbox; never mutate on GET.
router.post('/approve', async (req, res) => res.json(await emailChange(req, 'approve')));
router.use(authenticate);
router.get('/status', async (req, res) => res.json(await emailChange(req, 'status')));
for (const action of ['start', 'resend', 'verify']) router.post('/' + action, async (req, res) => {
  const result = await emailChange(req, action);
  if (action === 'verify') clearSessionCookies(res);
  res.json(result);
});
export default router;
