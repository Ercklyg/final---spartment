import { createHash } from 'node:crypto';
import { report } from '../models/reports.js';
import { readSessionCookie } from './sessionCookies.js';

const pending = new Map();

// Share only concurrent calculations from the same authenticated session.
// Settled results are removed immediately so later reads observe record changes.
export async function loadAnalyticsReport(req, args) {
  const token = req.headers && readSessionCookie(req, 'access');
  if (!token || !req.user?.id || req.role !== 'admin') return report(req.db, 'analytics_report', args);
  const session = createHash('sha256').update(token).digest('hex');
  const key = JSON.stringify([req.user.id, session, args.p_month, args.p_period, args.p_export]);
  if (pending.has(key)) return pending.get(key);
  const task = report(req.db, 'analytics_report', args);
  pending.set(key, task);
  try { return await task; }
  finally { if (pending.get(key) === task) pending.delete(key); }
}
