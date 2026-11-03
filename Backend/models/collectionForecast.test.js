import test from 'node:test';
import assert from 'node:assert/strict';
import { collectionForecast, forecastWindow, loadCollectionForecast } from './collectionForecast.js';
import { generateAnalyticsPdf } from '../../Frontend/src/lib/analyticsPdf.js';

test('November forecast averages August to October and excludes partial November collections', () => {
  const result = collectionForecast([
    { payment_date: '2026-08-15', amount: '100.10' },
    { payment_date: '2026-08-16', amount: '200.20' },
    { payment_date: '2026-09-20', amount: '600.40' },
    { payment_date: '2026-10-31', amount: '900.50' },
    { payment_date: '2026-11-01', amount: '99999.99' },
  ], '2026-11', '2026-11-03');
  assert.equal(result.forecastMonth, '2026-11');
  assert.deepEqual(result.forecastMonths, [
    { label: '2026-08', value: 300.30, paymentCount: 2 },
    { label: '2026-09', value: 600.40, paymentCount: 1 },
    { label: '2026-10', value: 900.50, paymentCount: 1 },
  ]);
  assert.equal(result.forecast, 600.40);
  assert.equal(result.forecastStatus, 'ready');
});

test('a missing source month prevents an estimate even with other months present', () => {
  const result = collectionForecast([
    { payment_date: '2026-08-01', amount: 300 },
    { payment_date: '2026-10-01', amount: 900 },
    { payment_date: '2026-11-01', amount: 600 },
  ], '2026-11', '2026-11-03');
  assert.equal(result.forecast, null);
  assert.equal(result.forecastStatus, 'missing_history');
  assert.deepEqual(result.forecastMonths[1], { label: '2026-09', value: 0, paymentCount: 0 });
});

test('month boundaries use completed history across year changes and future requests', () => {
  assert.deepEqual(forecastWindow('2026-01', '2026-11-03').labels, ['2025-10', '2025-11', '2025-12']);
  assert.deepEqual(forecastWindow('2026-12', '2026-11-03'), {
    forecastMonth: '2026-11', labels: ['2026-08', '2026-09', '2026-10'],
    sourceStart: '2026-08-01', sourceEnd: '2026-11-01',
  });
  assert.deepEqual(forecastWindow('2026-12', '2026-12-01').labels, ['2026-09', '2026-10', '2026-11']);
});

test('history loader queries exactly the three source months and sums all response pages', async () => {
  const filters = [];
  const pages = [
    [{ payment_date: '2026-08-01', amount: 300 }],
    [{ payment_date: '2026-09-01', amount: 600 }, { payment_date: '2026-10-01', amount: 900 }], [],
  ];
  const db = { from: table => {
    assert.equal(table, 'payments');
    const query = {
      select() { return this; }, gte(field, value) { filters.push([field, '>=', value]); return this; },
      lt(field, value) { filters.push([field, '<', value]); return this; }, order() { return this; },
      async range() { return { data: pages.shift() }; },
    };
    return query;
  } };
  const result = await loadCollectionForecast(db, '2026-11', '2026-11-03');
  assert.equal(result.forecast, 600);
  assert.ok(filters.every(([, operator, date]) => date === (operator === '>=' ? '2026-08-01' : '2026-11-01')));
  assert.deepEqual(result.forecastMonths.map(point => point.value), [300, 600, 900]);
});

test('PDF labels its forecast with the explicit target month from the API', () => {
  const pdf = generateAnalyticsPdf({
    snapshot: { rows: [], inventory: [] }, series: [], forecastMonth: '2026-11', forecast: 600,
    forecastMonths: [{ label: '2026-08', value: 300 }, { label: '2026-09', value: 600 }, { label: '2026-10', value: 900 }],
  }, '2026-11', 'Monthly');
  const text = new TextDecoder().decode(pdf);
  assert.ok(text.includes('November 2026'));
  assert.ok(!text.includes('December 2026'));
});
