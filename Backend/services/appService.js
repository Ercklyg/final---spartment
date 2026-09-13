import { createUserClient } from '../config/supabase.js';
import { HttpError } from '../middleware/errors.js';
import { loadTenantAccount } from '../models/tenantAccount.js';
import { report } from '../models/reports.js';
import { loadBills, createBill, recordPayment, billingOverview, loadBillingLeases, today } from '../models/billing.js';
import { loadRequests, submitInquiry, submitTenantRequest } from '../models/requests.js';
import { loadNotifications, markNotificationsRead, markAllNotificationsRead } from '../models/notifications.js';
import { loadPaymentReceipt } from '../models/paymentReceipt.js';
import { analyticsCsv, comparisonTotals } from '../models/adminAnalytics.js';
import { changePassword } from '../models/changePassword.js';
import { signInWithPassword } from '../models/authentication.js';
import { authFailure } from '../models/authErrors.js';
import { readAll } from '../models/readAll.js';
import * as validate from './validation.js';
import { readSessionCookie } from './sessionCookies.js';
import { createHash } from 'node:crypto';
const checked=result=>{if(result.error)throw new HttpError(400,result.error.message);return result.data;};
export const login=async(req)=>{
  if(typeof req.body?.email!=='string'||!req.body.email.trim()||typeof req.body?.password!=='string'||!req.body.password.length)throw new HttpError(400,'Email and password are required.');
  const result=await signInWithPassword(createUserClient(),req.body.email.trim().toLowerCase(),req.body.password);
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
  catch(error){if(error.code==='invalid_credentials')error.status=400;throw error;}
  try{await changePassword(client.auth,createUserClient().auth,req.body);return ({ok:true});}
  finally{await client.auth.signOut({scope:'local'});}
};
export const profile=async(req)=>(checked(await req.db.from('profiles').select('id,role,full_name').eq('id',req.user.id).single()));
export const account=async(req)=>(await loadTenantAccount(req.db,req.user));
export const bills=async(req)=>{const bills=await loadBills(req.db);return req.query.view==='overview'?{bills,summary:billingOverview(bills)}:bills;};
export const billCreate=async(req)=>(await createBill(req.db,req.body));
export const paymentCreate=async(req)=>{
  const body=validate.object(req.body),form=validate.object(body.form,'Payment details');
  const payment={amount:validate.amount(form.amount),date:validate.date(form.date,'payment date'),reference:validate.text(form.reference,'reference',254,true)};
  await recordPayment(req.db,{id:validate.uuid(body.billId,'bill ID')},payment,validate.uuid(body.id,'payment ID'));return ({ok:true});
};
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
export const inquiry=async(req)=>{
  const body=validate.object(req.body),form=validate.object(body.form,'Inquiry details');
  const clean={fullName:validate.text(form.fullName,'name',160),email:validate.email(form.email),contact:validate.text(form.contact,'phone',40,true),preferredRoom:validate.text(form.preferredRoom,'preferred room',160,true),moveInDate:validate.date(form.moveInDate,'move-in date',true),message:validate.text(form.message,'message',4000)};
  await submitInquiry(createUserClient(),clean,validate.uuid(body.id,'inquiry ID'));return ({ok:true});
};
export const notifications=async(req)=>loadNotifications(req.db,req.user.id,validate.page(req.query),req.query.before);
export const readNotifications=async(req)=>{
  if(req.body?.all===true)await markAllNotificationsRead(req.db,req.user.id,req.body.before);
  else await markNotificationsRead(req.db,validate.ids(req.body?.ids),req.user.id);
  return {ok:true};
};
const roomColumns='id,room_number,floor,status,monthly_rate,description,size_sqm,capacity,buildings(name),tenant_assignments(full_name)';
export const rooms=async(req)=>readAll(()=>req.db.from('rooms').select(roomColumns).order('floor').order('room_number').order('id'));
export const publicRooms=async()=>{const db=createUserClient();return readAll(()=>db.from('rooms').select('id,room_number,floor,status,size_sqm,capacity,monthly_rate,description,buildings(name)').eq('status','available').order('floor').order('room_number').order('id'));};
export const roomCreate=async(req)=>{
  const body=validate.object(req.body);
  const room={building:validate.text(body.building,'building name',160),room:validate.text(body.room,'room number',40),floor:validate.number(body.floor,'floor',1,1000,true),size:validate.number(body.size,'room size',8,10),rate:validate.amount(body.rate,'monthly rate'),capacity:validate.choice(String(body.capacity),['2','3','2-3'],'capacity'),notes:validate.text(body.notes,'description',4000,true)};
  if(!/^\d{3,}$/.test(room.room))throw new HttpError(400,'Enter a room number with at least 3 digits.');
  let building=checked(await req.db.from('buildings').select('id').eq('name',room.building.trim()).maybeSingle());
  if(!building)building=checked(await req.db.from('buildings').insert({name:room.building.trim()}).select('id').single());
  return (checked(await req.db.from('rooms').insert({building_id:building.id,room_number:room.room.trim(),floor:room.floor,status:'available',size_sqm:room.size,capacity:room.capacity+' persons',monthly_rate:room.rate,description:(room.notes||'').trim()}).select(roomColumns).single()));
};
export const roomStatus=async(req)=>{validate.uuid(req.params.id,'room ID');validate.choice(req.body?.status,['available','occupied','reserved','maintenance'],'room status');return (checked(await req.db.from('rooms').update({status:req.body.status}).eq('id',req.params.id).select(roomColumns).single()));};
export const tenants=async(req)=>report(req.db,'tenant_directory_page',validate.page(req.query));
export const billingLeases=async(req)=>loadBillingLeases(req.db);
export const billingWorkspace=async(req)=>{
  if(req.query.month){
    const {month,type,status='All',search=''}=req.query;
    if(typeof month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new HttpError(400,'Invalid billing month.');
    const data=await report(req.db,'billing_page',{p_month:month+'-01',p_type:validate.choice(type,['rent','utility'],'bill type'),p_status:validate.choice(status,['All','Paid','Pending','Partially paid','Late'],'status'),p_search:validate.text(search,'search',160,true),...validate.page(req.query)});
    return {...data,summary:{months:{[month]:{[type]:data.totals}}}};
  }
  const [bills,leases]=await Promise.all([loadBills(req.db),loadBillingLeases(req.db)]);
  return ({bills,summary:billingOverview(bills),leases});
};
export const requestWorkspace=async(req)=>({requests:await loadRequests(req.db),inquiries:await readAll(()=>req.db.from('inquiries').select('*').order('created_at',{ascending:false}).order('id'))});
export const inquiryUpdate=async(req)=>{validate.uuid(req.params.id,'inquiry ID');validate.choice(req.body?.status,['Open','Resolved'],'status');return (checked(await req.db.from('inquiries').update({status:req.body.status}).eq('id',req.params.id).select('id').single()));};
export const correctionHistory=async(req)=>{validate.uuid(req.params.id,'payment ID');return readAll(()=>req.db.from('payment_corrections').select('id,reason,previous_values,corrected_values,created_at,corrected_by').eq('payment_id',req.params.id).order('created_at',{ascending:false}).order('id'));};
export const analytics=async(req)=>{
  const {month,period='Monthly'}=req.query;
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month||'')||!['Monthly','Quarterly','Yearly'].includes(period))throw new HttpError(400,'Invalid report period.');
  const data=await report(req.db,'analytics_report',{p_month:month+'-01',p_period:period,p_export:req.query.export==='csv'});
  const {snapshot,series,forecastMonths}=data;
  if(req.query.export==='csv')return {csv:analyticsCsv(snapshot,series,month)};
  const currentMonth=today().slice(0,7);
  const forecast=month>=currentMonth||forecastMonths.some(p=>!p.paymentCount)?null:Math.round(forecastMonths.reduce((sum,p)=>sum+Math.round(p.value*100),0)/3)/100;
  return {...data,comparison:comparisonTotals(series),forecast,loadedAt:new Date().toISOString()};
};
