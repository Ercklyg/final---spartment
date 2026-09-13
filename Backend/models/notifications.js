import { HttpError } from '../middleware/errors.js';

function cutoff(value) {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(value)||!Number.isFinite(Date.parse(value)))throw new HttpError(400,'Invalid notification cutoff.');
  return new Date(value).toISOString();
}
export async function loadNotifications(client,userId,{p_offset,p_limit},before) {
  const asOf=before?cutoff(before):new Date().toISOString();
  const [rows,unread]=await Promise.all([
    client.from('notifications').select('id,title,message,is_read,created_at,kind,source_id',{count:'exact'}).eq('tenant_id',userId).lte('created_at',asOf).order('created_at',{ascending:false}).order('id').range(p_offset,p_offset+p_limit-1),
    client.from('notifications').select('id',{count:'exact',head:true}).eq('tenant_id',userId).eq('is_read',false).lte('created_at',asOf),
  ]);
  if(rows.error||unread.error)throw new HttpError(503,'Unable to load notifications. Please retry.');
  return {data:rows.data,total:rows.count,unreadCount:unread.count,asOf,offset:p_offset,limit:p_limit};
}
export async function markNotificationsRead(client,ids,userId) {
  for(let offset=0;offset<ids.length;offset+=100){
    const {error}=await client.from('notifications').update({is_read:true}).eq('tenant_id',userId).in('id',ids.slice(offset,offset+100));
    if(error)throw new Error('Unable to mark notifications as read. Please retry.');
  }
}
export async function markAllNotificationsRead(client,userId,before) {
  const {error}=await client.from('notifications').update({is_read:true}).eq('tenant_id',userId).eq('is_read',false).lte('created_at',cutoff(before));
  if(error)throw new HttpError(503,'Unable to mark notifications as read. Please retry.');
}
