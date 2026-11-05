import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reportingPeriod } from './reportingPeriod.js';
import { today } from './billing.js';

const db = months => ({ async rpc(name, args) { assert.equal(name, 'reporting_months'); assert.deepEqual(args, {}); return { data: months }; } });
test('available reporting months retain holes and a valid selected month', async () => {
  assert.deepEqual(await reportingPeriod(db(['2026-07','2026-09']), '2026-07'), { availableMonths:['2026-07','2026-09'], reportMonth:'2026-07' });
});
test('unavailable or future selections fall back to latest actual reporting month', async () => {
  for (const requested of ['2026-08','2099-12','2020-01']) assert.equal((await reportingPeriod(db(['2026-07','2026-09']), requested)).reportMonth, '2026-09');
});
test('empty reporting history remains explicit and uses current month only for the empty snapshot', async () => {
  assert.deepEqual(await reportingPeriod(db([]), '2099-12'), { availableMonths:[], reportMonth:today().slice(0,7) });
});
test('month discovery errors do not silently enable empty months', async () => {
  await assert.rejects(reportingPeriod({rpc:async()=>({error:{message:'offline'}})}, '2026-09'), {status:503});
});
test('reporting month discovery is administrator-only, RLS-protected, deduplicated, and excludes future records', () => {
  const sql=readFileSync(new URL('../supabase/migrations/202611050002_reporting_months.sql',import.meta.url),'utf8');
  assert.match(sql,/security invoker/);
  assert.match(sql,/if not public.is_admin\(\)/);
  assert.match(sql,/from public.bills/);
  assert.match(sql,/from public.payments/);
  assert.match(sql,/union/);
  assert.match(sql,/array_agg\(month order by month\)/);
  assert.equal((sql.match(/Asia\/Manila/g)||[]).length,2);
  assert.match(sql,/revoke all.*from public,anon/);
});
