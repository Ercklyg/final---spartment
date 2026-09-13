import { HttpError } from '../middleware/errors.js';
const resources={
  rooms:{table:'rooms',select:'*,buildings(name)'},
  buildings:{table:'buildings',select:'*'},
  tenants:{table:'tenant_assignments',select:'*,rooms(room_number,buildings(name))'},
  profiles:{table:'profiles',select:'id,full_name,phone,role'},
  leases:{table:'leases',select:'*,profiles(full_name),rooms(room_number,buildings(name))'},
  bills:{table:'bills',select:'*,payments(id,amount,payment_date,reference_note),leases(tenant_id,profiles(full_name),rooms(room_number,buildings(name)))'},
  payments:{table:'payments',select:'*'},
  requests:{table:'tenant_requests',select:'*,profiles(full_name),rooms(room_number,buildings(name))'},
  inquiries:{table:'inquiries',select:'*'},
  notifications:{table:'notifications',select:'*'},
  corrections:{table:'payment_corrections',select:'*'},
};
export async function listResources(db,resource,offset,limit){
  const config=resources[resource];if(!config)throw new HttpError(404,'Resource not found.');
  const {data,error}=await db.from(config.table).select(config.select).order('id').range(offset,offset+limit-1);
  if(error)throw new HttpError(400,'Unable to read requested records.');
  return data;
}
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
export async function markRead(db,userId,ids){
  const {data,error}=await db.from('notifications').update({is_read:true}).eq('tenant_id',userId).in('id',ids).select('id');
  if(error)throw new HttpError(400,'Unable to update notifications.');
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
