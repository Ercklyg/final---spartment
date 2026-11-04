import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendations } from './aiRecommendations.js';
import { generateContent } from '../models/gemini.js';
import { getRecommendationPreview, saveRecommendationPreview, clearRecommendationPreviews } from '../../Frontend/src/lib/aiRecommendations.js';

const snapshot = { cutoff: '2026-01-31', occupancy: 70, collected: 100, rows: [], late: [] };
const item = { title: 'Review collections', text: 'Review the 100 collected this month.', category: 'insight' };
function enableTestAi(t) {
  const previous = { AI_RECOMMENDATIONS_ENABLED: process.env.AI_RECOMMENDATIONS_ENABLED, GEMINI_API_KEY: process.env.GEMINI_API_KEY };
  process.env.AI_RECOMMENDATIONS_ENABLED = 'true';
  process.env.GEMINI_API_KEY = 'test-only';
  t.after(() => { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
}

test('recommendations serve saved insights before querying analytics and isolate accounts', async t => {
  enableTestAi(t);
  let reports = 0, requests = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    requests++;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify([item]) }] } }] }));
  });
  const req = { user: { id: 'cache-test' }, body: { month: '2026-01' }, db: { async rpc() { reports++; return { data: { snapshot } }; } } };
  const first = await recommendations(req);
  assert.equal(first.cached, false);
  const cached = await recommendations(req);
  assert.equal(cached.cached, true);
  assert.equal(reports, 1);
  assert.equal(requests, 1);

  const realNow = Date.now();
  t.mock.method(Date, 'now', () => realNow + 13 * 60 * 60 * 1000);
  const stale = await recommendations(req);
  assert.equal(stale.stale, true);
  assert.equal(stale.refreshRecommended, true);
  assert.equal(reports, 1, 'expired insights are returned immediately for background refresh');

  const forced = { ...req, body: { ...req.body, force: true } };
  const [fresh, same] = await Promise.all([recommendations(forced), recommendations(forced)]);
  assert.deepEqual(fresh, same);
  assert.equal(fresh.cached, false);
  assert.equal(requests, 2, 'overlapping refreshes share one provider request');
  assert.equal(reports, 2);

  await recommendations({ ...req, user: { id: 'another-admin' } });
  assert.equal(reports, 3, 'another account does not receive the first account cache');
});

test('busy provider falls back immediately without a 20-second same-model retry', async t => {
  enableTestAi(t);
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    return new Response(JSON.stringify({ error: { message: 'Busy' } }), { status: 503 });
  });
  await assert.rejects(generateContent({ apiKey: 'test-only', model: 'test', prompt: 'test' }), { status: 503 });
  assert.equal(calls, 1);
  const result = await recommendations({ user: { id: 'busy-test' }, body: { month: '2026-02' }, db: { async rpc() { return { data: { snapshot } }; } } });
  assert.equal(result.source, 'local');
  assert.ok(result.items.length);
  assert.equal(calls, 3, 'primary and fallback are each tried once');
});

test('a failed refresh retains the last successful recommendations', async t => {
  enableTestAi(t);
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify([item]) }] } }] })));
  const req = { user: { id: 'failed-refresh' }, body: { month: '2026-03' }, db: { async rpc() { return { data: { snapshot } }; } } };
  const first = await recommendations(req);
  fetchMock.mock.mockImplementation(async () => new Response('{}', { status: 503 }));
  const failed = await recommendations({ ...req, body: { ...req.body, force: true } });
  assert.deepEqual(failed.items, first.items);
  assert.equal(failed.stale, true);
  assert.equal(failed.source, 'cache');
});

test('client previews are separated by month and can be cleared on account changes', () => {
  clearRecommendationPreviews();
  saveRecommendationPreview('2026-01', { items: [item], updatedAt: '2026-01-31' });
  assert.equal(getRecommendationPreview('2026-01').cached, true);
  assert.equal(getRecommendationPreview('2026-02'), null);
  clearRecommendationPreviews();
  assert.equal(getRecommendationPreview('2026-01'), null);
});

test('a slow provider attempt is aborted after six seconds', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }));
  const request = generateContent({ apiKey: 'test-only', model: 'test', prompt: 'test' });
  const rejected = assert.rejects(request, { name: 'AbortError' });
  t.mock.timers.tick(6000);
  await rejected;
});
