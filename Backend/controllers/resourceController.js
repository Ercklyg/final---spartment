import * as service from '../services/resourceService.js';
export const list=async(req,res)=>res.json(await service.list(req.db,req.params.resource,req.query));
export const action=name=>async(req,res)=>res.status(201).json({data:await service.perform(req.db,name,req.body)});
export const createTenant=async(req,res)=>res.status(201).json(await service.createTenant(req.db,req.body));
export const changeRequest=async(req,res)=>res.json({data:await service.changeRequest(req.db,req.params.id,req.body)});
export const markRead=async(req,res)=>res.json({data:await service.readNotifications(req.db,req.user.id,req.body)});
export const me=(req,res)=>res.json({id:req.user.id,email:req.user.email,role:req.role});
