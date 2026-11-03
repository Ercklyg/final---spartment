import { today } from './billing.js';
import { readAll } from './readAll.js';

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
    const rows = payments.filter(payment => String(payment.payment_date).slice(0, 7) === label);
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
  const payments = await readAll(() => client.from('payments').select('amount,payment_date')
    .gte('payment_date', sourceStart).lt('payment_date', sourceEnd).order('payment_date').order('id'));
  return collectionForecast(payments, month, asOf);
}
