import * as model from '../models/resourceModel.js';
import { HttpError } from '../middleware/errors.js';
import * as validate from './validation.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const actions={
  correctPayment:['correct_bill_payment',['p_id','p_payment','p_amount','p_date','p_reference','p_reason','p_expected']],
};
export async function perform(db,action,body){
  if(!body||typeof body!=='object'||Array.isArray(body))throw new HttpError(400,'A JSON object is required.');
  const [name,fields]=actions[action];
  if(fields.some(field=>!(field in body)))throw new HttpError(400,'Missing required fields.');
  const args=Object.fromEntries(fields.map(field=>[field,body[field]]));
  for(const field of ['p_id','p_payment'])if(field in args)args[field]=validate.uuid(args[field],field.slice(2));
  for(const field of ['p_period','p_due','p_date'])if(field in args)args[field]=validate.date(args[field],field.slice(2));
  if('p_amount' in args)args.p_amount=validate.amount(args.p_amount);
  if('p_reference' in args)args.p_reference=validate.text(args.p_reference,'reference',254,true);
  if(action==='correctPayment'){
    args.p_reason=validate.text(args.p_reason,'correction reason',500);
    const expected=validate.object(args.p_expected,'Original payment');
    args.p_expected={amount:validate.amount(expected.amount),payment_date:validate.date(expected.payment_date),reference_note:validate.text(expected.reference_note,'original reference',254,true)};
  }
  return model.executeFunction(db,name,args);
}
export async function changeRequest(db,id,body){
  if(!uuid.test(id)||!['New','Scheduled','In progress','Resolved'].includes(body?.status)||typeof body?.admin_note!=='string'||body.admin_note.length>4000)throw new HttpError(400,'Invalid request update.');
  return model.updateRequest(db,id,body.status,body.admin_note.trim());
}
export async function createTenant(db,body){
  if(!body||typeof body!=='object'||Array.isArray(body))throw new HttpError(400,'Tenant details are required.');
  return model.invokeTenantCreation(db,body);
}
