import { HttpError, serviceError } from '../middleware/errors.js';
import { readAll } from './readAll.js';

export async function changeOccupancy(db, args) {
  const {data,error}=await db.rpc('change_tenant_occupancy',args);
  if(error)throw error.code==='23505'
    ? new HttpError(409,'This tenant assignment already exists.')
    : serviceError(400,'Unable to update the tenant assignment. Please retry.',error);
  return data;
}
export const leaseHistory=(db,id)=>readAll(()=>db.from('leases').select('*,rooms(room_number,buildings(name))').eq('tenant_id',id).order('move_in_date',{ascending:false}).order('id'));
