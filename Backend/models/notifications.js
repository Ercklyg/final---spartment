import { HttpError } from '../middleware/errors.js';
import { summarizeBill, today } from './billing.js';

function cutoff(value) {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(value)||!Number.isFinite(Date.parse(value)))throw new HttpError(400,'Invalid notification cutoff.');
  return new Date(value).toISOString();
}
export async function loadNotifications(client,userId,{p_offset,p_limit},before) {
  const asOf=before?cutoff(before):new Date().toISOString();
  const [rows,unread]=await Promise.all([
    client.from('notifications').select('id,title,message,is_read,created_at,kind,source_id',{count:'exact'}).eq('tenant_id',userId).lte('created_at',asOf).order('is_read',{ascending:true}).order('created_at',{ascending:false}).order('id').range(p_offset,p_offset+p_limit-1),
    client.from('notifications').select('id',{count:'exact',head:true}).eq('tenant_id',userId).eq('is_read',false).lte('created_at',asOf),
  ]);
  if(rows.error||unread.error)throw new HttpError(503,'Unable to load notifications. Please retry.');
  const billIds=[...new Set(rows.data.filter(item=>item.kind==='bill'&&item.source_id).map(item=>item.source_id))];
  const alerts=new Map();
  if(billIds.length){
    const bills=await client.from('bills').select('id,due_date,rent_amount,electricity_amount,water_amount,payments(amount)').in('id',billIds);
    if(bills.error)throw new HttpError(503,'Unable to load payment reminders. Please retry.');
    const current=today();
    for(const raw of bills.data){
      const bill=summarizeBill(raw);
      const days=Math.round((Date.parse(bill.due_date)-Date.parse(current))/86400000);
      if(bill.balance>0&&days<=7)alerts.set(bill.id,days<0?'Payment overdue':days===0?'Payment due today':'Payment due soon');
    }
  }
  return {data:rows.data.map(item=>({...item,alert:item.kind==='bill'?alerts.get(item.source_id)||null:null})),total:rows.count,unreadCount:unread.count,asOf,offset:p_offset,limit:p_limit};
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
