import * as service from '../services/resourceService.js';
import { flushPushNotifications } from '../services/appService.js';
export const action=name=>async(req,res)=>res.status(201).json({data:await service.perform(req.db,name,req.body)});
export const createTenant=async(req,res)=>res.status(201).json(await service.createTenant(req.db,req.body));
export const changeRequest=async(req,res)=>{const data=await service.changeRequest(req.db,req.params.id,req.body);await flushPushNotifications(req.db);res.json({data});};
