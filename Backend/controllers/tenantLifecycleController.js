import * as service from '../services/tenantLifecycleService.js';
export const moveOut=async(req,res)=>res.json(await service.change(req,false));
export const transfer=async(req,res)=>res.json(await service.change(req,true));
export const history=async(req,res)=>res.json(await service.history(req));
