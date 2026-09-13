import * as model from '../models/resourceModel.js';
import { HttpError } from '../middleware/errors.js';
import * as validate from './validation.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function list(db,resource,query){
  const offset=Number(query.offset??0),limit=Number(query.limit??100);
  if(!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>1000)throw new HttpError(400,'Use a non-negative offset and a limit from 1 to 1000.');
  return {data:await model.listResources(db,resource,offset,limit),offset,limit};
}
const actions={
  createBill:['create_bill',['p_lease','p_type','p_period','p_due','p_rent','p_electricity','p_water']],
  recordPayment:['record_bill_payment',['p_bill','p_id','p_amount','p_date','p_reference']],
  correctPayment:['correct_bill_payment',['p_id','p_payment','p_amount','p_date','p_reference','p_reason','p_expected']],
  submitRequest:['submit_tenant_request',['p_id','p_kind','p_subject','p_message','p_priority']],
};
export async function perform(db,action,body){
  if(!body||typeof body!=='object'||Array.isArray(body))throw new HttpError(400,'A JSON object is required.');
  const [name,fields]=actions[action];
  if(fields.some(field=>!(field in body)))throw new HttpError(400,'Missing required fields.');
  const args=Object.fromEntries(fields.map(field=>[field,body[field]]));
  for(const field of ['p_lease','p_bill','p_id','p_payment'])if(field in args)args[field]=validate.uuid(args[field],field.slice(2));
  for(const field of ['p_period','p_due','p_date'])if(field in args)args[field]=validate.date(args[field],field.slice(2));
  for(const field of ['p_rent','p_electricity','p_water'])if(field in args)args[field]=validate.amount(args[field],field.slice(2),0);
  if('p_amount' in args)args.p_amount=validate.amount(args.p_amount);
  if('p_reference' in args)args.p_reference=validate.text(args.p_reference,'reference',254,true);
  if(action==='createBill')args.p_type=validate.choice(args.p_type,['rent','utility'],'bill type');
  if(action==='correctPayment'){
    args.p_reason=validate.text(args.p_reason,'correction reason',500);
    const expected=validate.object(args.p_expected,'Original payment');
    args.p_expected={amount:validate.amount(expected.amount),payment_date:validate.date(expected.payment_date),reference_note:validate.text(expected.reference_note,'original reference',254,true)};
  }
  if(action==='submitRequest'){
    args.p_kind=validate.choice(args.p_kind,['maintenance','other'],'request type');
    args.p_subject=validate.text(args.p_subject,'subject',160);
    args.p_message=validate.text(args.p_message,'message',4000);
    args.p_priority=validate.choice(args.p_priority,['Normal','High','Urgent'],'priority');
  }
  return model.executeFunction(db,name,args);
}
export async function changeRequest(db,id,body){
  if(!uuid.test(id)||!['Open','Scheduled','In progress','Resolved'].includes(body?.status)||typeof body?.admin_note!=='string'||body.admin_note.length>4000)throw new HttpError(400,'Invalid request update.');
  return model.updateRequest(db,id,body.status,body.admin_note.trim());
}
export async function readNotifications(db,userId,body){
  if(!Array.isArray(body?.ids)||body.ids.length<1||body.ids.length>100||!body.ids.every(id=>uuid.test(id)))throw new HttpError(400,'Provide between 1 and 100 notification IDs.');
  return model.markRead(db,userId,body.ids);
}
export async function createTenant(db,body){
  if(!body||typeof body!=='object'||Array.isArray(body))throw new HttpError(400,'Tenant details are required.');
  return model.invokeTenantCreation(db,body);
}
