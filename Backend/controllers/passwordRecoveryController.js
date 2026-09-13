import * as service from '../services/passwordRecoveryService.js';
import { clearSessionCookies } from '../services/sessionCookies.js';

export const requestReset = async (req, res) => res.json(await service.requestReset(req.body));
export const verifyReset = async (req, res) => res.json(await service.verifyReset(req.body));
export const resetPassword = async (req, res) => {const result=await service.resetPassword(req.body);clearSessionCookies(res);res.json(result);};
