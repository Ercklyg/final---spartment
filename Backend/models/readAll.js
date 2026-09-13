import { HttpError } from '../middleware/errors.js';

// Advance by the actual response length, even if the hosted row cap is lower
// than the requested page size. Callers include a unique ID in their ordering.
export async function readAll(query) {
  const rows = [];
  for (let offset = 0; ; ) {
    const { data, error } = await query().range(offset, offset + 499);
    if (error) throw new HttpError(503, 'Unable to load records. Please retry.');
    if (!data.length) return rows;
    rows.push(...data);
    offset += data.length;
  }
}
