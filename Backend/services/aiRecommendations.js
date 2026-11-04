import { HttpError } from '../middleware/errors.js';
import { report } from '../models/reports.js';
import { generateContent } from '../models/gemini.js';
import * as validate from './validation.js';
import { today } from '../models/billing.js';

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const cache = new Map();
const lastGood = new Map();
const pending = new Map();

const CATEGORIES = ['warning', 'opportunity', 'attention', 'insight'];
const PAGES = ['Billing', 'Rooms', 'Tenants', 'Customer Requests'];
const CATEGORY_PAGE = { warning: 'Billing', opportunity: 'Rooms', attention: 'Customer Requests', insight: 'Billing' };

function fallback(reason) {
  return { fallback: true, reason, items: [], cached: false, updatedAt: null };
}

function buildPayload(snapshot, month) {
  const late = [...(snapshot.late || [])].sort((a, b) => b.balance - a.balance).slice(0, 10)
    .map(b => ({ name: b.name, room: b.room, balance: b.balance, due_date: b.due_date }));
  const repeat = (snapshot.collectionHealth?.repeatLatePayers || []).slice(0, 5)
    .map(t => ({ name: t.name, room: t.room, lateBills: t.lateBillCount, overdue: t.overdueBalance }));
  return {
    month,
    cutoff: snapshot.cutoff,
    overdue: snapshot.overdue,
    outstanding: snapshot.outstanding,
    collected: snapshot.collected,
    occupancy: Math.round((snapshot.occupancy || 0) * 10) / 10,
    availableRooms: snapshot.available,
    vacancyGap: snapshot.vacancyGap,
    lateCount: (snapshot.late || []).length,
    topOverdue: late,
    repeatLatePayers: repeat,
    openRequests: (snapshot.openRequests || []).length,
    openInquiries: (snapshot.openInquiries || []).length,
  };
}

function buildPrompt(payload) {
  return [
    'You are an apartment operations assistant. Recommend up to 4 useful actions for the admin.',
    'Write every item as a constructive recommendation, not as an alert or warning. Lead with the action the admin can take.',
    'Use calm, supportive language. Mention the supporting number after the recommended action.',
    'Rules: use ONLY tenant names from the input; never invent names, amounts, or rooms.',
    'Each item needs a concrete number and one action. Titles max 60 chars, texts max 140 chars.',
    'Cover only conditions present in the data: overdue/late = "warning", vacant rooms = "opportunity",',
    'pending requests/inquiries = "attention", collections/occupancy summary = "insight". Omit empty categories.',
    'When late bills or repeat late payers exist, recommend a supportive admin check-in and suggest discussing',
    'optional installments or a due-date adjustment as a case-by-case way to help the tenant catch up and support retention.',
    'Frame this only as an option for the admin to discuss: do not claim payment plans are built into the system,',
    'promise approval, or invent payment policies. Use repeatLatePayers for named repeat-late cases.',
    'If a tenant has every bill Paid across 6 or more bills, include an "insight" celebrating them by name',
    'with their settled count and suggest a loyalty discount this month.',
    'Return a bare JSON array, no markdown: [{"title":"...","text":"...","category":"warning|opportunity|attention|insight"}].',
    'Data: ' + JSON.stringify(payload),
  ].join(' ');
}

const peso = value => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value) || 0);

export function consistentPayers(rows) {
  const byName = new Map();
  for (const b of rows || []) {
    const entry = byName.get(b.name) || { name: b.name, total: 0, paid: 0 };
    entry.total += 1;
    if ((b.balance || 0) <= 0.005) entry.paid += 1;
    byName.set(b.name, entry);
  }
  return [...byName.values()]
    .filter(e => e.total >= 6 && e.paid === e.total && e.name && e.name !== 'Unknown tenant')
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .slice(0, 2);
}

export function buildLocalInsights(snapshot, month) {
  const items = [];
  const late = [...(snapshot.late || [])].sort((a, b) => b.balance - a.balance);
  if ((snapshot.overdue || 0) > 0 && late.length) {
    const repeat = (snapshot.collectionHealth?.repeatLatePayers || [])
      .filter(t => t.name && t.name !== 'Unknown tenant')
      .sort((a, b) => (b.lateBillCount || 0) - (a.lateBillCount || 0))[0];
    items.push(repeat ? {
      title: `Offer ${repeat.name} a payment check-in`,
      text: `Consider discussing installments or a due-date change; ${repeat.lateBillCount} bills currently need follow-up.`,
      category: 'warning', page: 'Billing',
    } : {
      title: `Schedule payment follow-ups`,
      text: `Consider flexible options case by case for ${late.length} bill${late.length === 1 ? '' : 's'} totaling ${peso(snapshot.overdue)}.`,
      category: 'warning', page: 'Billing',
    });
  }
  for (const star of consistentPayers(snapshot.rows).slice(0, 1)) {
    items.push({
      title: `${star.name} never missed a bill`,
      text: `${star.paid}/${star.total} bills settled. Consider a loyalty discount.`,
      category: 'insight', page: 'Billing',
    });
  }
  if ((snapshot.available || 0) > 0) {
    items.push({
      title: `${snapshot.available} vacant room${snapshot.available === 1 ? '' : 's'} ready`,
      text: `${peso(snapshot.vacancyGap)} in monthly rates idle. Review listings.`,
      category: 'opportunity', page: 'Rooms',
    });
  }
  const requests = (snapshot.openRequests || []).length;
  const inquiries = (snapshot.openInquiries || []).length;
  if (requests + inquiries > 0 && items.length < 3) {
    items.push({
      title: `${requests + inquiries} request${requests + inquiries === 1 ? '' : 's'} need review`,
      text: `${requests} tenant, ${inquiries} guest. Respond to unblock tenants.`,
      category: 'attention', page: 'Customer Requests',
    });
  }
  const requestNote = requests + inquiries > 0 ? ` ${requests + inquiries} requests await review.` : '';
  items.push({
    title: `${month} at ${peso(snapshot.collected)}`,
    text: `Occupancy ${Math.round(snapshot.occupancy || 0)}%. Outstanding ${peso(snapshot.outstanding)}.${requestNote}`,
    category: 'insight', page: 'Billing',
  });
  return items.slice(0, 4);
}
function sanitize(raw, allowedNames) {  if (!Array.isArray(raw)) return [];
  const items = [];
  for (const entry of raw) {
    if (!entry || typeof entry.title !== 'string' || typeof entry.text !== 'string') continue;
    const category = CATEGORIES.includes(entry.category) ? entry.category : null;
    if (!category) continue;
    const title = entry.title.trim().slice(0, 60);
    const text = entry.text.trim().slice(0, 140);
    if (!title || !text) continue;
    const page = PAGES.includes(entry.page) ? entry.page : CATEGORY_PAGE[category];
    items.push({ title, text, category, page });
    if (items.length >= 4) break;
  }
  void allowedNames;
  return items;
}

export async function recommendations(req) {
  const body = validate.object(req.body);
  const month = typeof body.month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(body.month)
    ? body.month
    : null;
  if (!month) throw new HttpError(400, 'Invalid report month.');
  const period = validate.choice(body.period || 'Monthly', ['Monthly', 'Quarterly', 'Yearly'], 'report period');
  const force = body.force === true;
  const enabled = process.env.AI_RECOMMENDATIONS_ENABLED === 'true' && Boolean(process.env.GEMINI_API_KEY);
  const [year, monthNumber] = month.split('-').map(Number);
  const monthEnd = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
  const cutoff = [today(), monthEnd].sort()[0];
  // Authentication/role checks run before this service. Keep entries scoped to
  // the authenticated account, reporting period and Manila reporting cutoff.
  const key = req.user.id + '|' + month + '|' + period + '|' + cutoff;
  const hit = cache.get(key);
  if (enabled && !force && hit) {
    const stale = hit.expiresAt <= Date.now();
    return { ...hit.data, cached: true, stale, refreshRecommended: stale };
  }
  if (pending.has(key)) return pending.get(key);
  const task = generateRecommendations(req, { month, period, key });
  pending.set(key, task);
  try { return await task; }
  finally { if (pending.get(key) === task) pending.delete(key); }
}

async function generateRecommendations(req, { month, period, key }) {
  const data = await report(req.db, 'analytics_report', { p_month: month + '-01', p_period: period, p_export: false });
  const snapshot = data.snapshot;
  const payload = buildPayload(snapshot, month);
  if (process.env.AI_RECOMMENDATIONS_ENABLED !== 'true' || !process.env.GEMINI_API_KEY) {
    return { fallback: false, reason: null, items: buildLocalInsights(snapshot, month), cached: false, stale: false, source: 'local', updatedAt: new Date().toISOString() };
  }
  const prompt = buildPrompt(payload);
  const models = [...new Set([process.env.AI_MODEL || 'gemini-3.5-flash-lite', process.env.AI_FALLBACK_MODEL || 'gemini-flash-lite-latest'])];
  let rawText = null;
  let lastError = null;
  for (const model of models) {
    try {
      rawText = await generateContent({ apiKey: process.env.GEMINI_API_KEY, model, prompt });
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      if (error.status === 429 || error.status === 400 || error.status === 401) break;
    }
  }
  if (rawText == null) {
    console.warn('[ai-recommendations] Gemini failed, serving resilient insights', { status: lastError?.status });
    const prev = lastGood.get(key);
    if (prev) return { ...prev.data, cached: true, stale: true, source: 'cache' };
    return { fallback: false, reason: null, items: buildLocalInsights(snapshot, month), cached: false, stale: false, source: 'local', updatedAt: new Date().toISOString() };
  }
  let parsed = null;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    const prev = lastGood.get(key);
    if (prev) return { ...prev.data, cached: true, stale: true, source: 'cache' };
    return { fallback: false, reason: null, items: buildLocalInsights(snapshot, month), cached: false, stale: false, source: 'local', updatedAt: new Date().toISOString() };
  }
  const allowedNames = new Set([...payload.topOverdue.map(t => t.name), ...payload.repeatLatePayers.map(t => t.name)]);
  const items = sanitize(parsed, allowedNames);
  if (!items.length) {
    const prev = lastGood.get(key);
    if (prev) return { ...prev.data, cached: true, stale: true, source: 'cache' };
    return { fallback: false, reason: null, items: buildLocalInsights(snapshot, month), cached: false, stale: false, source: 'local', updatedAt: new Date().toISOString() };
  }
  const result = { fallback: false, reason: null, items, cached: false, stale: false, source: 'ai', updatedAt: new Date().toISOString() };
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, data: result });
  lastGood.set(key, { data: result, savedAt: Date.now() });
  return result;
}
