import { report } from './reports.js';
import { today } from './billing.js';

export async function reportingPeriod(db, requestedMonth) {
  const availableMonths = await report(db, 'reporting_months', {});
  const reportMonth = availableMonths.includes(requestedMonth) ? requestedMonth : availableMonths.at(-1) || today().slice(0, 7);
  return { availableMonths, reportMonth };
}
