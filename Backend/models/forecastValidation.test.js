import test from 'node:test';
import assert from 'node:assert/strict';
import { forecastValidation, loadForecastReport } from './collectionForecast.js';
import { generateAnalyticsPdf } from '../../Frontend/src/lib/analyticsPdf.js';
import { createClient } from '@supabase/supabase-js';

const payments = [100.10, 200.20, 300.30, 400.40, 500.50].map((amount, index) => ({ billing_period: `2026-0${index + 1}-15`, amount }));

test('rolling backtests use only the preceding three months and compare the same targets to the previous-month benchmark', () => {
  const result = forecastValidation(payments, '2026-06', '2026-06-18');
  assert.equal(result.throughMonth, '2026-05');
  assert.equal(result.testedMonths, 2);
  assert.deepEqual(result.rows, [
    { month: '2026-04', sourceMonths: ['2026-01', '2026-02', '2026-03'], forecast: 200.20, actual: 400.40, absoluteError: 200.20, benchmark: 300.30, benchmarkAbsoluteError: 100.10 },
    { month: '2026-05', sourceMonths: ['2026-02', '2026-03', '2026-04'], forecast: 300.30, actual: 500.50, absoluteError: 200.20, benchmark: 400.40, benchmarkAbsoluteError: 100.10 },
  ]);
  assert.equal(result.smaMae, 200.20);
  assert.equal(result.benchmarkMae, 100.10);
  const changed = payments.map(row => row.billing_period.startsWith('2026-04') ? { ...row, amount: 99999 } : row);
  assert.equal(forecastValidation(changed, '2026-06', '2026-06-18').rows[0].forecast, 200.20, 'target collections cannot leak into their own forecast');
});

test('selected historical month includes its completed actuals but no later targets or incomplete current month', () => {
  const historical = forecastValidation(payments, '2026-04', '2026-06-18');
  assert.equal(historical.throughMonth, '2026-04');
  assert.equal(historical.testedMonths, 1);
  assert.equal(historical.smaMae, 200.20);
  const future = forecastValidation([...payments, { billing_period: '2026-06-01', amount: 99999 }, { billing_period: '2026-07-01', amount: 99999 }], '2026-12', '2026-06-18');
  assert.deepEqual(future, forecastValidation(payments, '2026-06', '2026-06-18'));
});

test('missing source or target months are excluded rather than filled with invented zero collections', () => {
  const result = forecastValidation([...payments.filter(row => !row.billing_period.startsWith('2026-05')), { billing_period: '2026-07-10', amount: 800 }], '2026-08', '2026-08-18');
  assert.equal(result.testedMonths, 1);
  assert.deepEqual(result.skippedMonths, [
    { month: '2026-05', reason: 'missing_actual', missingSources: [] },
    { month: '2026-06', reason: 'missing_history', missingSources: ['2026-05'] },
    { month: '2026-07', reason: 'missing_history', missingSources: ['2026-05', '2026-06'] },
  ]);
  assert.equal(result.smaMae, 200.20);
  assert.equal(result.benchmarkMae, 100.10);
});

test('empty and short histories show no MAE while recorded zero totals remain distinct from absent records', () => {
  for (const rows of [[], payments.slice(0, 3)]) {
    const result = forecastValidation(rows, '2026-04', '2026-04-18');
    assert.equal(result.testedMonths, 0);
    assert.equal(result.smaMae, null);
    assert.equal(result.benchmarkMae, null);
  }
  const zero = forecastValidation([...payments.slice(0, 3), { billing_period: '2026-04-15', amount: 0 }], '2026-05', '2026-05-18');
  assert.equal(zero.testedMonths, 1);
  assert.equal(zero.rows[0].actual, 0);
  assert.equal(zero.smaMae, 200.20);
});

test('calendar windows cross year boundaries and sum individual payments in cents before averaging', () => {
  const result = forecastValidation([
    { billing_period: '2025-10-01', amount: '0.10' }, { billing_period: '2025-10-20', amount: '0.20' },
    { billing_period: '2025-11-01', amount: '0.10' }, { billing_period: '2025-12-01', amount: '0.10' },
    { billing_period: '2026-01-01', amount: '0.30' },
  ], '2026-02', '2026-02-18');
  assert.deepEqual(result.rows[0], { month: '2026-01', sourceMonths: ['2025-10', '2025-11', '2025-12'], forecast: 0.17, actual: 0.30, absoluteError: 0.13, benchmark: 0.10, benchmarkAbsoluteError: 0.20 });
});

test('report loader reads every history page once and caps records at the correct target boundary', async () => {
  for (const [month, boundary, count] of [['2026-06', '2026-06-01', 2], ['2026-04', '2026-05-01', 1]]) {
    const calls = [], offsets = [];
    const source = payments.filter(row => row.billing_period < boundary);
    const db = { from(table) {
      assert.equal(table, 'payments');
      const query = {
        select(columns) { assert.equal(columns, 'amount,payment_date,bills!inner(billing_period)'); return query; },
        lt(column, value) { calls.push([column, value]); return query; },
        lte(column, value) { assert.equal(column, 'payment_date'); assert.equal(value, '2026-06-18'); return query; },
        order() { return query; },
        async range(offset) { offsets.push(offset); return { data: source.slice(offset, offset + 2) }; },
      };
      return query;
    } };
    const result = await loadForecastReport(db, month, '2026-06-18');
    assert.equal(result.forecastValidation.testedMonths, count);
    assert.ok(calls.every(([column, value]) => column === 'bills.billing_period' && value === boundary));
    assert.deepEqual(offsets, source.length === 5 ? [0, 2, 4, 5] : [0, 2, 4]);
    assert.equal(result.forecast, month === '2026-06' ? 400.40 : 200.20);
  }
});

test('history failures do not produce fabricated validation results', async () => {
  const query = { select() { return query; }, lt() { return query; }, lte() { return query; }, order() { return query; }, range: async () => ({ error: { message: 'Unavailable' } }) };
  await assert.rejects(loadForecastReport({ from: () => query }, '2026-06', '2026-06-18'), error => error.status === 503);
});

test('bill-month backtesting includes later payments in the correct target and excludes future receipts', () => {
  const history = [7, 8, 9, 10].map((month, index) => ({
    bills: { billing_period: `2026-${String(month).padStart(2, '0')}-01` },
    payment_date: `2026-${String(month).padStart(2, '0')}-15`, amount: [150, 300, 600, 900][index],
  }));
  const result = forecastValidation([...history,
    { bills: { billing_period: '2026-10-01' }, payment_date: '2026-11-18', amount: 100 },
    { bills: { billing_period: '2026-11-01' }, payment_date: '2026-10-15', amount: 99999 },
    { bills: { billing_period: '2026-10-01' }, payment_date: '2026-11-19', amount: 99999 },
  ], '2026-11', '2026-11-18');
  assert.equal(result.testedMonths, 1);
  assert.equal(result.rows[0].month, '2026-10');
  assert.equal(result.rows[0].actual, 1000);
  assert.equal(result.rows[0].forecast, 350);
  assert.equal(result.smaMae, 650);
});

test('the actual Supabase query joins bill periods and filters receipt dates independently', async () => {
  const requests = [];
  const client = createClient('https://example.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async input => {
      const url = new URL(input);
      requests.push(url);
      const offset = Number(url.searchParams.get('offset'));
      return new Response(JSON.stringify(offset ? [] : [
        { amount: 300, payment_date: '2026-11-01', bills: { billing_period: '2026-08-01' } },
        { amount: 600, payment_date: '2026-11-02', bills: { billing_period: '2026-09-01' } },
        { amount: 900, payment_date: '2026-11-18', bills: { billing_period: '2026-10-01' } },
      ]), { status: 200, headers: { 'content-type': 'application/json' } });
    } },
  });
  const result = await loadForecastReport(client, '2026-11', '2026-11-18');
  assert.equal(result.forecast, 600);
  assert.equal(requests.length, 2);
  for (const url of requests) {
    assert.equal(url.searchParams.get('select'), 'amount,payment_date,bills!inner(billing_period)');
    assert.equal(url.searchParams.get('bills.billing_period'), 'lt.2026-11-01');
    assert.equal(url.searchParams.get('payment_date'), 'lte.2026-11-18');
    assert.equal(url.searchParams.get('order'), 'id.asc');
  }
});

test('PDF includes all validation rows, MAEs, sources, exclusions and retrospective limitations', () => {
  const validation = forecastValidation([...payments, { billing_period: '2026-07-01', amount: 800 }], '2026-08', '2026-08-18');
  const data = { snapshot: {}, series: [], forecastValidation: validation };
  const text = new TextDecoder().decode(generateAnalyticsPdf(data, '2026-08', 'Monthly'));
  for (const phrase of ['Forecast vs Actual', 'Average difference', 'Months checked', 'Estimated', 'Actually collected', 'below actual collections', '2026-04', '2026-05', '2026-06', 'Missing-payment months', 'currently recorded payments', 'No accuracy', '200.20', '100.10']) assert.ok(text.includes(phrase), phrase);
});
