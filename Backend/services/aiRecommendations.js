import { HttpError } from '../middleware/errors.js';
import { report } from '../models/reports.js';
import { generateContent } from '../models/gemini.js';
import * as validate from './validation.js';
import { today } from '../models/billing.js';
import { buildRecommendationFacts, recommendationPrompt, assembleRecommendations, hasVerifiedEvidence } from './recommendationFacts.js';
import { loadSavedRecommendations, saveRecommendations, saveRecommendationFailure } from '../models/savedAiRecommendations.js';

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const pending = new Map();

function savedResult(saved, { cached = true, cutoff } = {}) {
  const items = (saved?.items || []).filter(hasVerifiedEvidence);
  const failure = saved?.last_failure || null;
  const stale = Boolean(failure) || !saved?.generated_at || Date.parse(saved.generated_at) + CACHE_TTL_MS <= Date.now() || saved.reporting_cutoff !== cutoff;
  return { items, fallback: Boolean(failure), reason: failure, source: items.length ? (failure ? 'cache' : 'ai') : 'none',
    updatedAt: items.length ? saved?.generated_at || null : null, cached: items.length ? cached || Boolean(failure) : false, stale,
    refreshRecommended: false };
}

// Saved AI choices retain their generation date, but displayed identities and
// amounts always come from the current operational records. No model call.
function groundSaved(saved, snapshot, month) {
  const choices = (saved?.items || []).filter(hasVerifiedEvidence).map(({factId,actionId}) => ({factId,actionId}));
  return saved && {...saved,items:snapshot ? assembleRecommendations(choices,buildRecommendationFacts(snapshot,month)) : []};
}

export async function recommendations(req) {
  if (req.role !== 'admin') throw new HttpError(403, 'Administrator access required.');
  const body = validate.object(req.body);
  const month = typeof body.month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(body.month) ? body.month : null;
  if (!month) throw new HttpError(400, 'Invalid report month.');
  const period = validate.choice(body.period || 'Monthly', ['Monthly', 'Quarterly', 'Yearly'], 'report period');
  const [year, number] = month.split('-').map(Number);
  const cutoff = [today(), new Date(Date.UTC(year, number, 0)).toISOString().slice(0, 10)].sort()[0];
  const enabled = process.env.AI_RECOMMENDATIONS_ENABLED === 'true' && Boolean(process.env.GEMINI_API_KEY);
  // Read durable state even on a warm server so another instance's limit
  // response cannot be hidden by an older in-memory successful result.
  const saved = await loadSavedRecommendations(req.db, req.user.id, month, period);
  // Older free-text cards are not evidence-checked and must never be reused.
  const legacy = saved?.items?.length && !saved.items.every(hasVerifiedEvidence);
  let snapshot;
  try {
    snapshot = (await report(req.db,'analytics_report',{p_month:month+'-01',p_period:period,p_export:false})).snapshot;
  } catch { return savedResult({...saved,items:[],last_failure:'unavailable'},{cutoff}); }
  if (enabled && body.force !== true && saved && (!legacy || saved.last_failure)) return savedResult(groundSaved(saved,snapshot,month), { cutoff });
  const key = req.user.id + '|' + month + '|' + period + '|' + cutoff;
  if (pending.has(key)) return pending.get(key);
  const startedAt = new Date(Date.now()).toISOString();
  const task = generateRecommendations(req, { month, period, cutoff, startedAt, enabled, snapshot });
  pending.set(key, task);
  try { return await task; }
  finally { if (pending.get(key) === task) pending.delete(key); }
}

async function generateRecommendations(req, scope) {
  const { month, period, cutoff, enabled, snapshot } = scope;
  const fail = async reason => savedResult(groundSaved(await saveRecommendationFailure(req.db, { ...scope, reason }),snapshot,month), { cutoff });
  if (!enabled) return fail('unavailable');
  const facts = buildRecommendationFacts(snapshot, month);
  if (!facts.length) return fail('unavailable');
  const prompt = recommendationPrompt(facts, month, snapshot.cutoff);
  const models = [...new Set([process.env.AI_MODEL || 'gemini-3.5-flash-lite', process.env.AI_FALLBACK_MODEL || 'gemini-flash-lite-latest'])];
  let rawText = null, lastError = null;
  for (const model of models) {
    try { rawText = await generateContent({ apiKey: process.env.GEMINI_API_KEY, model, prompt }); lastError = null; break; }
    catch (error) {
      lastError = error;
      if ([400, 401, 402, 403, 429].includes(error.status)) break;
    }
  }
  if (rawText == null) {
    const reason = lastError?.status === 429 || lastError?.code === 'RESOURCE_EXHAUSTED' ? 'quota' : lastError?.status === 503 ? 'busy' : 'unavailable';
    console.warn('[ai-recommendations] provider unavailable', { status: lastError?.status, reason });
    return fail(reason);
  }
  let parsed;
  try { parsed = JSON.parse(rawText); } catch { return fail('unavailable'); }
  const items = assembleRecommendations(parsed, facts);
  if (!items.length) return fail('unavailable');
  const saved = await saveRecommendations(req.db, { ...scope, items });
  return savedResult(saved, { cached: false, cutoff });
}
