import * as service from '../services/tenantLifecycleService.js';
export const moveOut=async(req,res)=>res.json(await service.moveOut(req));
export const history=async(req,res)=>res.json(await service.history(req));
