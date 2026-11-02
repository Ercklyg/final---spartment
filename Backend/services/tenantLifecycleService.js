import * as validate from './validation.js';
import * as model from '../models/tenantLifecycle.js';

export const moveOut=async req=>{
  const body=validate.object(req.body);
  return model.changeOccupancy(req.db,{p_id:validate.uuid(body.id,'operation ID'),p_tenant:validate.uuid(req.params.id,'tenant ID'),p_lease:validate.uuid(body.leaseId,'active lease ID'),p_date:validate.date(body.date,'effective date'),p_room:null,p_rent:null,p_end:null});
};
export const history=req=>model.leaseHistory(req.db,validate.uuid(req.params.id,'tenant ID'));
