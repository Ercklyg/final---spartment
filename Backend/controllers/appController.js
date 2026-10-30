import * as service from '../services/appService.js';
import { setSessionCookies, clearSessionCookies, publicSession } from '../services/sessionCookies.js';
export const billingLeases=async(req,res)=>res.json(await service.billingLeases(req));
export const login=async(req,res)=>{const data=await service.login(req);setSessionCookies(res,data);res.json(publicSession(data));};
export const refresh=async(req,res)=>{
  try{const data=await service.refresh(req);setSessionCookies(res,data);res.json(publicSession(data));}
  catch(error){if(error.status===401)clearSessionCookies(res);throw error;}
};
export const session=async(req,res)=>{
  try{const data=await service.session(req);if(data.access_token)setSessionCookies(res,data);res.json(publicSession(data));}
  catch(error){if(error.status===401){clearSessionCookies(res);return res.json(null);}throw error;}
};
export const logout=async(req,res)=>{clearSessionCookies(res);res.json(await service.logout(req));};
export const password=async(req,res)=>res.status(200).json(await service.password(req));
export const profile=async(req,res)=>res.status(200).json(await service.profile(req));
export const account=async(req,res)=>res.status(200).json(await service.account(req));
export const bills=async(req,res)=>res.status(200).json(await service.bills(req));
export const billCreate=async(req,res)=>res.status(201).json(await service.billCreate(req));
export const paymentCreate=async(req,res)=>res.status(201).json(await service.paymentCreate(req));
export const receipt=async(req,res)=>res.status(200).json(await service.receipt(req));
export const requests=async(req,res)=>res.status(200).json(await service.requests(req));
export const requestCreate=async(req,res)=>res.status(201).json(await service.requestCreate(req));
export const inquiry=async(req,res)=>res.status(201).json(await service.inquiry(req));
export const notifications=async(req,res)=>res.status(200).json(await service.notifications(req));
export const adminNotifications=async(req,res)=>res.json(await service.adminNotifications(req));
export const readNotifications=async(req,res)=>res.status(200).json(await service.readNotifications(req));
export const rooms=async(req,res)=>res.status(200).json(await service.rooms(req));
export const publicRooms=async(req,res)=>res.status(200).json(await service.publicRooms(req));
export const roomCreate=async(req,res)=>res.status(201).json(await service.roomCreate(req));
export const roomUpdate=async(req,res)=>res.status(200).json(await service.roomUpdate(req));
export const roomDelete=async(req,res)=>res.status(200).json(await service.roomDelete(req));
export const roomStatus=async(req,res)=>res.status(200).json(await service.roomStatus(req));
export const tenants=async(req,res)=>res.status(200).json(await service.tenants(req));
export const billingWorkspace=async(req,res)=>res.status(200).json(await service.billingWorkspace(req));
export const requestWorkspace=async(req,res)=>res.status(200).json(await service.requestWorkspace(req));
export const inquiryUpdate=async(req,res)=>res.status(200).json(await service.inquiryUpdate(req));
export const correctionHistory=async(req,res)=>res.status(200).json(await service.correctionHistory(req));
export const analytics=async(req,res)=>res.status(200).json(await service.analytics(req));
export const aiRecommendations=async(req,res)=>{const {recommendations}=await import('../services/aiRecommendations.js');res.status(200).json(await recommendations(req));};
