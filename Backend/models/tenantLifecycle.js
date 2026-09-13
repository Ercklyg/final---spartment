import { HttpError } from '../middleware/errors.js';
import { readAll } from './readAll.js';

export async function changeOccupancy(db, args) {
  const {data,error}=await db.rpc('change_tenant_occupancy',args);
  if(error)throw new HttpError(error.code==='23505'?409:400,error.message);
  return data;
}
export const leaseHistory=(db,id)=>readAll(()=>db.from('leases').select('*,rooms(room_number,buildings(name))').eq('tenant_id',id).order('move_in_date',{ascending:false}).order('id'));
