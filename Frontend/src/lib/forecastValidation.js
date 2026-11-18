import { money } from './billing.js';

export const validationMethod = 'Payments count toward the month of the bill being paid, even when received later. For each completed bill month, SMA averages payments applied to the preceding three bill months. The benchmark uses the total for the previous bill month. Both are tested on the same months; lower mean absolute error (MAE) is better.';
export const validationLimits = 'Retrospective results use currently recorded payments grouped by bill month, including later payments and corrections. They are not saved predictions issued in the past. Missing-payment months are excluded, not assumed to be zero. These records have not been independently verified by this report.';

export function validationSummary(validation) {
  if (!validation) return 'Past comparisons are unavailable. Refresh the report to load the latest results.';
  const count = validation.testedMonths;
  if (!count) return 'Not enough history to compare yet. We need four consecutive completed months with recorded payments: three to calculate an estimate and one to check what was actually collected.';
  if (count === 1) return 'Only one month has been checked. More history is needed to judge performance.';
  return `Across ${count} months checked, estimates differed from actual collections by an average of ${money(validation.smaMae)}. These results describe only the months checked, not future accuracy.`;
}

export function estimateDifference(row) {
  if (row.forecast === row.actual) return 'The estimate matched actual collections.';
  return `The estimate was ${money(row.absoluteError)} ${row.forecast < row.actual ? 'below' : 'above'} actual collections.`;
}

export function methodComparison(validation) {
  if (!validation?.testedMonths) return 'Both methods need the same completed months before they can be compared.';
  if (validation.smaMae === validation.benchmarkMae) return 'Both methods had the same average difference in the months checked.';
  return `${validation.smaMae < validation.benchmarkMae ? 'The three-month average' : 'Using the previous month'} was closer to actual collections on average in the months checked.`;
}
