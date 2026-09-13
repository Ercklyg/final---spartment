import { api } from './api.js';
export const changePassword=passwords=>api.post('/auth/password',passwords);
