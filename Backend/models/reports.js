import { HttpError } from '../middleware/errors.js';

export async function report(db,name,args) {
  const {data,error}=await db.rpc(name,args);
  if(error)throw new HttpError(503,'Unable to load records. Please retry.');
  return data;
}
