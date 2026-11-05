import { createUserClient } from '../config/supabase.js';
import { HttpError, serviceError } from '../middleware/errors.js';
import { loadTenantAccount } from '../models/tenantAccount.js';
import { report } from '../models/reports.js';
import { loadBills, createBill, recordPayment, billingOverview, loadBillingLeases, today } from '../models/billing.js';
import { loadRequests, submitInquiry, submitTenantRequest } from '../models/requests.js';
import { uploadMaintenanceAttachment, maintenanceAttachmentUrl } from '../models/maintenanceAttachments.js';
import { loadNotifications, markNotificationsRead, markAllNotificationsRead, updateNotificationEngagement, sendPaymentReminder, addReminderTimes } from '../models/notifications.js';
import { loadAdminNotifications } from '../models/adminNotifications.js';
import { loadPaymentReceipt } from '../models/paymentReceipt.js';
import { analyticsCsv, comparisonTotals } from '../models/adminAnalytics.js';
import { loadCollectionForecast } from '../models/collectionForecast.js';
import { changePassword } from '../models/changePassword.js';
import { signInWithPassword } from '../models/authentication.js';
import { authFailure } from '../models/authErrors.js';
import { readAll } from '../models/readAll.js';
import { roomColumns, createRoom, updateRoom, deleteRoom } from '../models/rooms.js';
import * as validate from './validation.js';
import { readSessionCookie } from './sessionCookies.js';
import { createHash } from 'node:crypto';
import { updateLoginLimit, loginNeedsSuccessClear } from '../middleware/loginLimit.js';
import { pushPublicKey, savePushSubscription, removePushSubscription, deliverPendingPushes } from '../models/webPush.js';
const deliverPush=async client=>{try{return await deliverPendingPushes(client);}catch(error){console.error('Push delivery failed:',error.message);return {enabled:true,sent:0,error:true};}};
export const pushReminders=deliverPush;
const checked=result=>{if(result.error)throw serviceError(400,'Unable to save the change. Please retry.',result.error);return result.data;};
const DEFAULT_IDLE_TIMEOUT_MINUTES=15;
export const config=()=>{
  const configured=Number.parseFloat(process.env.IDLE_TIMEOUT_MINUTES);
  return {idleTimeoutMinutes:Number.isFinite(configured)&&configured>0?configured:DEFAULT_IDLE_TIMEOUT_MINUTES};
};
export const login=async(req)=>{
  if(typeof req.body?.email!=='string'||!req.body.email.trim()||typeof req.body?.password!=='string'||!req.body.password.length)throw new HttpError(400,'Email and password are required.');
  let result;
  try{result=await signInWithPassword(createUserClient(),req.body.email.trim().toLowerCase(),req.body.password);}
  catch(error){if(error.code==='invalid_credentials')await updateLoginLimit(req,'login-failure');throw error;}
  if(loginNeedsSuccessClear(req))await updateLoginLimit(req,'login-success');
  return (result.session);
};
const refreshes=new Map();
export const refresh=async(req)=>{
  const token=readSessionCookie(req,'refresh');
  if(!token)throw new HttpError(401,'Session expired.');
  const key=createHash('sha256').update(token).digest('hex');
  if(refreshes.has(key))return refreshes.get(key);
  const operation=(async()=>{
  const result=await createUserClient().auth.refreshSession({refresh_token:token});
  if(result.error)throw authFailure(result.error);
  if(!result.data.session?.access_token)throw new HttpError(503,'Authentication is temporarily unavailable. Please try again later.','auth_unavailable');
  return (result.data.session);
  })();
  refreshes.set(key,operation);
  try{return await operation;}finally{refreshes.delete(key);}
};
export const session=async(req)=>{
  const token=readSessionCookie(req,'access');
  if(token){
    const {data,error}=await createUserClient().auth.getUser(token);
    if(error){const failure=authFailure(error);if(failure.status!==401)throw failure;}
    else if(data.user){
      // Auth verified the JWT before reading its expiry. No credential is returned.
      let expires_at;try{expires_at=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()).exp;}catch{throw new HttpError(401,'Invalid session.');}
      return {user:data.user,expires_at};
    }
  }
  return refresh(req);
};
export const logout=async(req)=>{
  const access_token=readSessionCookie(req,'access'),refresh_token=readSessionCookie(req,'refresh');
  if(!refresh_token)return {ok:true,revoked:!access_token};
  const operation=(async()=>{try{
    const client=createUserClient();
    const restored=access_token?await client.auth.setSession({access_token,refresh_token}):await client.auth.refreshSession({refresh_token});
    if(restored.error)return false;
    return !(await client.auth.signOut({scope:'local'})).error;
  }catch{return false;}})();
  let timer;
  try{return {ok:true,revoked:await Promise.race([operation,new Promise(resolve=>{timer=setTimeout(()=>resolve(false),4000);})])};}
  finally{clearTimeout(timer);}
};
export const password=async(req)=>{
  if(!['current','new','confirm'].every(key=>typeof req.body?.[key]==='string'))throw new HttpError(400,'Password fields are required.');
  const client=createUserClient();
  try{await signInWithPassword(client,req.user.email,req.body.current,'Your current password is incorrect.');}
  catch(error){if(error.code==='invalid_credentials'){await updateLoginLimit(req,'login-failure');error.status=400;}throw error;}
  if(loginNeedsSuccessClear(req))await updateLoginLimit(req,'login-success');
  try{await changePassword(client.auth,createUserClient().auth,req.body);return ({ok:true});}
  finally{await client.auth.signOut({scope:'local'});}
};
export const profile=async(req)=>req.profile;
export const account=async(req)=>(await loadTenantAccount(req.db,req.user));
export const bills=async(req)=>{const bills=await loadBills(req.db);return req.query.view==='overview'?{bills,summary:billingOverview(bills)}:bills;};
export const billCreate=async(req)=>{const result=await createBill(req.db,req.body);await deliverPush(req.db);return result;};
export const paymentCreate=async(req)=>{
  const body=validate.object(req.body),form=validate.object(body.form,'Payment details');
  const payment={amount:validate.amount(form.amount),date:validate.date(form.date,'payment date'),reference:validate.text(form.reference,'reference',254,true)};
  await recordPayment(req.db,{id:validate.uuid(body.billId,'bill ID')},payment,validate.uuid(body.id,'payment ID'));await deliverPush(req.db);return ({ok:true});
};
export const paymentReminder=async(req)=>{const result=await sendPaymentReminder(req.db,validate.uuid(req.body?.billId,'bill ID'));await deliverPush(req.db);return result;};
export const receipt=async(req)=>(await loadPaymentReceipt(req.db,validate.uuid(req.params.id,'payment ID')));
export const requests=async(req)=>(await loadRequests(req.db));
export const requestCreate=async(req)=>{
  const body=validate.object(req.body),form=validate.object(body.form,'Request details');
  validate.uuid(body.id,'request ID');validate.choice(body.kind,['maintenance','other'],'request type');
  const fields=body.kind==='maintenance'?['issue','description']:['subject','message'];
  const clean={...form,[fields[0]]:validate.text(form[fields[0]],'subject',160),[fields[1]]:validate.text(form[fields[1]],'message',4000)};
  if(body.kind==='maintenance')clean.priority=validate.choice(form.priority,['Normal','High','Urgent'],'priority');
  await submitTenantRequest(req.db,body.kind,clean,body.id);return ({ok:true});
};
export const requestAttachment=async(req)=>uploadMaintenanceAttachment(req.db,req.user.id,validate.uuid(req.params.id,'request ID'),req.body,req.get('Content-Type')?.split(';')[0].trim().toLowerCase(),req.query.name);
export const requestAttachmentUrl=async(req)=>maintenanceAttachmentUrl(req.db,validate.uuid(req.params.id,'request ID'),validate.uuid(req.params.attachmentId,'attachment ID'));
export const inquiry=async(req)=>{
  const body=validate.object(req.body),form=validate.object(body.form,'Inquiry details');
  const clean={fullName:validate.text(form.fullName,'name',160),email:validate.email(form.email),contact:validate.text(form.contact,'phone',40,true),preferredRoom:validate.text(form.preferredRoom,'preferred room',160,true),moveInDate:validate.date(form.moveInDate,'move-in date',true),message:validate.text(form.message,'message',4000)};
  await submitInquiry(createUserClient(),clean,validate.uuid(body.id,'inquiry ID'));return ({ok:true});
};
export const notifications=async(req)=>loadNotifications(req.db,req.user.id,validate.page(req.query),req.query.before);
export const adminNotifications=async(req)=>loadAdminNotifications(req.db);
export const readNotifications=async(req)=>{
  if(req.body?.all===true)await markAllNotificationsRead(req.db,req.user.id,req.body.before);
  else await markNotificationsRead(req.db,validate.ids(req.body?.ids),req.user.id);
  return {ok:true};
};
export const notificationEngagement=async(req)=>{await updateNotificationEngagement(req.db,req.user.id,validate.ids(req.body?.ids),validate.choice(req.body?.action,['seen','acknowledged'],'notification action'));return {ok:true};};
export const notificationPreferences=async(req)=>{
  const {data,error}=await req.db.from('notification_preferences').select('user_id,sound_enabled,browser_enabled,billing_enabled,payment_enabled,request_enabled,account_enabled').eq('user_id',req.user.id).maybeSingle();
  if(error)throw new HttpError(503,'Unable to load notification preferences.');
  return data||{user_id:req.user.id,sound_enabled:false,browser_enabled:false,billing_enabled:true,payment_enabled:true,request_enabled:true,account_enabled:true};
};
export const saveNotificationPreferences=async(req)=>{
  const fields=['sound_enabled','browser_enabled','billing_enabled','payment_enabled','request_enabled','account_enabled'];
  const values={user_id:req.user.id};for(const field of fields){if(typeof req.body?.[field]!=='boolean')throw new HttpError(400,'Invalid notification preference.');values[field]=req.body[field];}
  const {data,error}=await req.db.from('notification_preferences').upsert(values).select().single();if(error)throw new HttpError(503,'Unable to save notification preferences.');return data;
};
export const pushKey=async()=>pushPublicKey();
export const pushSubscribe=async(req)=>savePushSubscription(req.db,req.user.id,req.body,req.get('User-Agent'));
export const pushUnsubscribe=async(req)=>removePushSubscription(req.db,req.user.id,req.body?.endpoint);
export const flushPushNotifications=deliverPush;
export const rooms=async(req)=>readAll(()=>req.db.from('rooms').select(roomColumns).order('floor').order('room_number').order('id'));
export const publicRooms=async()=>{const db=createUserClient();return readAll(()=>db.from('rooms').select('id,room_number,floor,status,size_sqm,capacity,monthly_rate,description,buildings(name)').eq('status','available').order('floor').order('room_number').order('id'));};
export const roomCreate=async(req)=>createRoom(req.db,req.body);
export const roomUpdate=async(req)=>updateRoom(req.db,req.params.id,req.body);
export const roomDelete=async(req)=>deleteRoom(req.db,req.params.id);
export const roomStatus=async(req)=>{validate.uuid(req.params.id,'room ID');validate.choice(req.body?.status,['available','occupied','reserved','maintenance'],'room status');return (checked(await req.db.from('rooms').update({status:req.body.status}).eq('id',req.params.id).select(roomColumns).single()));};
export const tenants=async(req)=>{
  const search=validate.text(req.query.search,'search',160,true).trim().toLowerCase();
  const page=validate.page(req.query);
  return report(req.db,'tenant_directory_search_page',{p_search:search,...page});
};
export const billingLeases=async(req)=>{
  const {month,type}=req.query;
  if(month==null&&type==null)return loadBillingLeases(req.db);
  if(typeof month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new HttpError(400,'Invalid billing month.');
  return loadBillingLeases(req.db,month,validate.choice(type,['rent','utility'],'bill type'));
};
export const billingWorkspace=async(req)=>{
  if(req.query.month){
    const {month,type,status='All',search=''}=req.query;
    if(typeof month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new HttpError(400,'Invalid billing month.');
    const data=await report(req.db,'billing_page',{p_month:month+'-01',p_type:validate.choice(type,['rent','utility'],'bill type'),p_status:validate.choice(status,['All','Paid','Pending','Partially paid','Late'],'status'),p_search:validate.text(search,'search',160,true),...validate.page(req.query)});
    return {...data,bills:await addReminderTimes(req.db,data.bills),summary:{months:{[month]:{[type]:data.totals}}}};
  }
  const [bills,leases]=await Promise.all([loadBills(req.db),loadBillingLeases(req.db)]);
  return ({bills:await addReminderTimes(req.db,bills),summary:billingOverview(bills),leases});
};
export const requestWorkspace=async(req)=>report(req.db,'request_workspace_page',{
  p_filter:validate.choice(req.query.filter??'All',['All','Maintenance','Other','Inquiry'],'request filter'),
  ...validate.page(req.query),
});
export const inquiryUpdate=async(req)=>{validate.uuid(req.params.id,'inquiry ID');validate.choice(req.body?.status,['New','Contacted','Resolved'],'status');return (checked(await req.db.from('inquiries').update({status:req.body.status}).eq('id',req.params.id).select('id').single()));};
export const correctionHistory=async(req)=>{validate.uuid(req.params.id,'payment ID');return readAll(()=>req.db.from('payment_corrections').select('id,reason,previous_values,corrected_values,created_at,corrected_by').eq('payment_id',req.params.id).order('created_at',{ascending:false}).order('id'));};
export const analytics=async(req)=>{
  const {month,period='Monthly'}=req.query;
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month||'')||!['Monthly','Quarterly','Yearly'].includes(period))throw new HttpError(400,'Invalid report period.');
  const exportType=req.query.export;
  if(exportType && !['csv','pdf'].includes(exportType))throw new HttpError(400,'Invalid report export format.');
  const data=await report(req.db,'analytics_report',{p_month:month+'-01',p_period:period,p_export:exportType==='csv'||exportType==='pdf'});
  const {snapshot,series}=data;
  if(req.query.export==='csv')return {csv:analyticsCsv(snapshot,series,month)};
  const forecastData=await loadCollectionForecast(req.db,month);
  return {...data,comparison:comparisonTotals(series),...forecastData,loadedAt:new Date().toISOString()};
};
