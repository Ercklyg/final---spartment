import { HttpError, serviceError } from '../middleware/errors.js';
import * as validate from './validation.js';

export function reminderScope(input) {
  const body = validate.object(input);
  if (typeof body.month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(body.month)) throw new HttpError(400, 'Select a valid billing month.');
  return { p_month: body.month + '-01', p_type: validate.choice(body.type, ['rent', 'utility'], 'bill type'), p_audience: validate.choice(body.audience, ['all_unpaid', 'overdue', 'partially_paid'], 'reminder audience') };
}

export async function previewBulkReminders(req) {
  const { data, error } = await req.db.rpc('preview_bill_reminders', reminderScope(req.query));
  if (error) throw serviceError(503, 'Unable to preview reminders. Please retry.', error);
  return data;
}

export async function sendBulkReminders(req) {
  const scope = reminderScope(req.body);
  const id = validate.uuid(req.body.id, 'reminder operation ID');
  const { data, error } = await req.db.rpc('send_bulk_bill_reminders', { ...scope, p_id: id });
  if (error) throw serviceError(503, 'Unable to confirm reminder delivery. Retry without changing the selection.', error);
  return data;
}
