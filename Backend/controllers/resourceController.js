import * as service from '../services/resourceService.js';
export const action=name=>async(req,res)=>res.status(201).json({data:await service.perform(req.db,name,req.body)});
export const createTenant=async(req,res)=>res.status(201).json(await service.createTenant(req.db,req.body));
export const changeRequest=async(req,res)=>res.json({data:await service.changeRequest(req.db,req.params.id,req.body)});
