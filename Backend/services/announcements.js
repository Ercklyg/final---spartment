import { HttpError, serviceError } from '../middleware/errors.js';
import * as validate from './validation.js';

function admin(req) {
  if (req.role !== 'admin') throw new HttpError(403, 'Administrator access required.');
}

function checked({ data, error }) {
  if (!error) return data;
  if (error.code === '42501') throw new HttpError(403, 'Administrator access required.');
  if (error.code === 'P0002') throw new HttpError(404, 'Announcement not found. Refresh the list.');
  if (error.code === '23505') throw new HttpError(409, 'This submission was already used. Refresh the list before posting again.');
  if (error.code === '22023') throw new HttpError(400, 'Enter a title up to 150 characters and a message up to 5,000 characters.');
  if (error.code === 'P0001' && error.message === 'No current tenants to notify') {
    throw new HttpError(400, 'There are no current tenants to notify. Add an active tenant before posting.');
  }
  throw serviceError(503, 'Unable to save the announcement. Please retry.', error);
}

export async function listAnnouncements(req) {
  admin(req);
  const { p_offset: offset, p_limit: limit } = validate.page(req.query);
  const result = await req.db.from('announcements')
    .select('id,title,message,author_id,created_at,updated_at,recipient_count', { count: 'exact' })
    .order('created_at', { ascending: false }).order('id').range(offset, offset + limit - 1);
  if (result.error) throw serviceError(503, 'Unable to load announcements. Please retry.', result.error);
  return { data: result.data, total: result.count, offset, limit };
}

export async function saveAnnouncement(req, editing = false) {
  admin(req);
  const body = validate.object(req.body);
  return checked(await req.db.rpc(editing ? 'edit_announcement' : 'post_announcement', {
    p_id: validate.uuid(editing ? req.params.id : body.id, 'announcement ID'),
    p_title: validate.text(body.title, 'announcement title', 150),
    p_message: validate.text(body.message, 'announcement message', 5000),
  }));
}

export async function deleteAnnouncement(req) {
  admin(req);
  return checked(await req.db.rpc('delete_announcement', { p_id: validate.uuid(req.params.id, 'announcement ID') }));
}

function tenant(req) {
  if (req.role !== 'tenant') throw new HttpError(403, 'Tenant access required.');
}

export async function unreadAnnouncements(req) {
  tenant(req);
  const { p_offset: offset, p_limit: limit } = validate.page(req.query);
  const result = await req.db.from('notifications')
    .select('id,title,message,created_at,source_id,announcement_revision', { count: 'exact' })
    .eq('tenant_id', req.user.id).eq('kind', 'announcement').eq('is_read', false)
    .order('created_at', { ascending: true }).order('id').range(offset, offset + limit - 1);
  if (result.error) throw serviceError(503, 'Unable to load announcements. Please retry.', result.error);
  return { data: result.data, total: result.count, offset, limit };
}

export async function acknowledgeAnnouncement(req) {
  tenant(req);
  const id = validate.uuid(req.params.id, 'notification ID');
  const revision = validate.number(req.body?.revision, 'announcement revision', 1, 2147483647, true);
  const now = new Date().toISOString();
  const result = await req.db.from('notifications').update({ is_read: true, seen_at: now, acknowledged_at: now })
    .eq('tenant_id', req.user.id).eq('kind', 'announcement').eq('id', id)
    .eq('announcement_revision', revision).select('id').maybeSingle();
  if (result.error) throw serviceError(503, 'Unable to acknowledge the announcement. Please retry.', result.error);
  if (!result.data) throw new HttpError(409, 'This announcement changed or was removed. Refresh and review the latest version.');
  return { ok: true };
}
