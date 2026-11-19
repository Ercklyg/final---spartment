import { today } from './billing.js';
import { readAll } from './readAll.js';

const billMonth = payment => String(payment.bills?.billing_period ?? payment.billing_period ?? '').slice(0, 7);
const receivedBy = (payment, asOf) => !payment.payment_date || payment.payment_date <= asOf;
const paymentColumns = 'amount,payment_date,billing_period';

// The selected month is the forecast target. Never use an incomplete month
// as source history, even if an API caller requests a future report month.
export function forecastWindow(month, asOf = today()) {
  const forecastMonth = month < asOf.slice(0, 7) ? month : asOf.slice(0, 7);
  const [year, targetMonth] = forecastMonth.split('-').map(Number);
  const labels = Array.from({ length: 3 }, (_, index) =>
    new Date(Date.UTC(year, targetMonth - 4 + index, 1)).toISOString().slice(0, 7));
  return { forecastMonth, labels, sourceStart: labels[0] + '-01', sourceEnd: forecastMonth + '-01' };
}

export function collectionForecast(payments, month, asOf = today()) {
  const { forecastMonth, labels } = forecastWindow(month, asOf);
  const forecastMonths = labels.map(label => {
    const rows = payments.filter(payment => billMonth(payment) === label && receivedBy(payment, asOf));
    const cents = rows.reduce((sum, payment) => sum + Math.round(Number(payment.amount) * 100), 0);
    return { label, value: cents / 100, paymentCount: rows.length };
  });
  const forecastStatus = forecastMonths.some(point => !point.paymentCount) ? 'missing_history' : 'ready';
  const forecast = forecastStatus === 'ready'
    ? Math.round(forecastMonths.reduce((sum, point) => sum + Math.round(point.value * 100), 0) / 3) / 100
    : null;
  return { forecastMonth, forecastMonths, forecastStatus, forecast };
}

export async function loadCollectionForecast(client, month, asOf = today()) {
  const { sourceStart, sourceEnd } = forecastWindow(month, asOf);
  const payments = await readAll(() => client.rpc('forecast_payments').select(paymentColumns)
    .gte('billing_period', sourceStart).lt('billing_period', sourceEnd)
    .lte('payment_date', asOf).order('id'));
  return collectionForecast(payments, month, asOf);
}

const shiftMonth = (month, offset) => {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year, number - 1 + offset, 1)).toISOString().slice(0, 7);
};

// Retrospective one-month-ahead evaluation. Never use the target month's
// collections to construct its forecast, or evaluate an incomplete target.
export function forecastValidation(payments, month, asOf = today()) {
  const currentMonth = asOf.slice(0, 7);
  const throughMonth = month < currentMonth ? month : shiftMonth(currentMonth, -1);
  const totals = new Map();
  for (const payment of payments) {
    const label = billMonth(payment);
    if (!/^\d{4}-\d{2}$/.test(label) || label > throughMonth || !receivedBy(payment, asOf)) continue;
    const value = totals.get(label) || { cents: 0, count: 0 };
    value.cents += Math.round(Number(payment.amount) * 100);
    value.count++;
    totals.set(label, value);
  }
  const historyStart = [...totals.keys()].sort()[0] || null;
  const rows = [], skippedMonths = [];
  let smaErrorCents = 0, benchmarkErrorCents = 0;
  for (let target = historyStart && shiftMonth(historyStart, 3); target && target <= throughMonth; target = shiftMonth(target, 1)) {
    const sourceMonths = [-3, -2, -1].map(offset => shiftMonth(target, offset));
    const missingSources = sourceMonths.filter(label => !totals.has(label));
    if (missingSources.length || !totals.has(target)) {
      skippedMonths.push({ month: target, reason: missingSources.length ? 'missing_history' : 'missing_actual', missingSources });
      continue;
    }
    const forecastCents = Math.round(sourceMonths.reduce((sum, label) => sum + totals.get(label).cents, 0) / 3);
    const actualCents = totals.get(target).cents;
    const benchmarkCents = totals.get(sourceMonths[2]).cents;
    const absoluteError = Math.abs(forecastCents - actualCents);
    const benchmarkAbsoluteError = Math.abs(benchmarkCents - actualCents);
    smaErrorCents += absoluteError;
    benchmarkErrorCents += benchmarkAbsoluteError;
    rows.push({ month: target, sourceMonths, forecast: forecastCents / 100, actual: actualCents / 100,
      absoluteError: absoluteError / 100, benchmark: benchmarkCents / 100, benchmarkAbsoluteError: benchmarkAbsoluteError / 100 });
  }
  return { historyStart, throughMonth, testedMonths: rows.length, skippedMonths, rows,
    smaMae: rows.length ? Math.round(smaErrorCents / rows.length) / 100 : null,
    benchmarkMae: rows.length ? Math.round(benchmarkErrorCents / rows.length) / 100 : null };
}

export async function loadForecastReport(client, month, asOf = today()) {
  const target = forecastWindow(month, asOf).forecastMonth;
  const end = (target < asOf.slice(0, 7) ? shiftMonth(target, 1) : target) + '-01';
  // One paginated history read serves both the current SMA and all eligible
  // backtests. The selected historical month is the latest permitted target.
  const payments = await readAll(() => client.rpc('forecast_payments').select(paymentColumns)
    .lt('billing_period', end).lte('payment_date', asOf).order('id'));
  return { ...collectionForecast(payments, month, asOf), forecastValidation: forecastValidation(payments, month, asOf) };
}
