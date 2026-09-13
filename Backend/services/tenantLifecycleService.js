import * as validate from './validation.js';
import * as model from '../models/tenantLifecycle.js';

export const change=async(req,transfer)=>{
  const body=validate.object(req.body);
  return model.changeOccupancy(req.db,{p_id:validate.uuid(body.id,'operation ID'),p_tenant:validate.uuid(req.params.id,'tenant ID'),p_lease:validate.uuid(body.leaseId,'active lease ID'),p_date:validate.date(body.date,'effective date'),p_room:transfer?validate.uuid(body.roomId,'destination room ID'):null,p_rent:transfer?validate.amount(body.rent,'monthly rent'):null,p_end:transfer?validate.date(body.leaseEnd,'lease end',true):null});
};
export const history=req=>model.leaseHistory(req.db,validate.uuid(req.params.id,'tenant ID'));
