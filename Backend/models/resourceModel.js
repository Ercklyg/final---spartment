import { HttpError } from '../middleware/errors.js';
export async function executeFunction(db,name,args){
  const {data,error}=await db.rpc(name,args);
  if(error)throw new HttpError(error.code==='23505'?409:400,error.message);
  return data;
}
export async function updateRequest(db,id,status,note){
  const {data,error}=await db.from('tenant_requests').update({status,admin_note:note}).eq('id',id).select('id,status,admin_note').single();
  if(error)throw new HttpError(400,'Unable to update request.');
  return data;
}
export async function invokeTenantCreation(db,body){
  const {data,error}=await db.functions.invoke('create-tenant',{body});
  if(error){
    let message='Unable to create tenant.';
    try{message=(await error.context.json()).error || message;}catch{}
    throw new HttpError(400,message);
  }
  return data;
}
