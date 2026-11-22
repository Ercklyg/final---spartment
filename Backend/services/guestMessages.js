import * as validate from './validation.js';
import { HttpError, serviceError } from '../middleware/errors.js';

export function validateGuestMessage(body) {
  const input = validate.object(body);
  const form = validate.object(input.form, 'Message details');
  const email = validate.text(form.email, 'email address', 254, true);
  const phone = validate.text(form.contact, 'contact number', 11, true);
  if (phone && !/^[0-9]{1,11}$/.test(phone)) throw new HttpError(400, 'Enter a contact number with up to 11 digits.');
  if (!email && !phone) throw new HttpError(400, 'Provide an email address or contact number so management can respond.');
  return {
    id: validate.uuid(input.id, 'message ID'),
    inquiry_type: 'general', status: 'New',
    full_name: validate.text(form.fullName, 'name', 160),
    email: email ? validate.email(email) : null, phone: phone || null,
    subject: validate.text(form.subject, 'subject', 160),
    message: validate.text(form.message, 'message', 4000),
    room_id: null, preferred_room: null, move_in_date: null,
  };
}

export async function submitGuestMessage(client, body) {
  const record = validateGuestMessage(body);
  const { error } = await client.from('inquiries').insert(record);
  // A retry keeps its submission ID; it must not create another message.
  if (error && error.code !== '23505') throw serviceError(400, 'Unable to send your message. Please retry.', error);
  return { ok: true };
}
