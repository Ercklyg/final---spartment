import { randomUUID } from 'node:crypto';
import { HttpError, serviceError } from '../middleware/errors.js';

export const maintenanceBucket='maintenance-attachments';
export const maxAttachmentBytes=10*1024*1024;
export const maxAttachments=5;
const types={
 'image/jpeg':{extension:'jpg',matches:b=>b.length>=3&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff},
 'image/png':{extension:'png',matches:b=>b.length>=8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))},
 'image/webp':{extension:'webp',matches:b=>b.length>=12&&b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP'},
 'application/pdf':{extension:'pdf',matches:b=>b.length>=5&&b.subarray(0,5).toString()==='%PDF-'},
};
export function validateMaintenanceFile(buffer,mimeType,originalName){
 if(!Buffer.isBuffer(buffer)||!buffer.length)throw new HttpError(400,'Choose a file to upload.');
 if(buffer.length>maxAttachmentBytes)throw new HttpError(413,'Each attachment must be 10 MB or smaller.');
 const type=types[mimeType];if(!type||!type.matches(buffer))throw new HttpError(400,'Upload a valid JPG, PNG, WebP, or PDF file.');
 const name=String(originalName||'').trim();if(!name||name.length>180||/[\u0000-\u001f\u007f]/.test(name))throw new HttpError(400,'The attachment file name is invalid.');
 return {name,mimeType,extension:type.extension};
}
export async function uploadMaintenanceAttachment(client,userId,requestId,buffer,mimeType,originalName){
 const file=validateMaintenanceFile(buffer,mimeType,originalName),id=randomUUID(),path=`${requestId}/${id}.${file.extension}`;
 const existing=await client.from('maintenance_attachments').select('id',{count:'exact',head:true}).eq('request_id',requestId);
 if(existing.error)throw new HttpError(404,'Maintenance request not found.');
 if((existing.count||0)>=maxAttachments)throw new HttpError(400,`A maintenance request can have up to ${maxAttachments} attachments.`);
 const uploaded=await client.storage.from(maintenanceBucket).upload(path,buffer,{contentType:mimeType,upsert:false,cacheControl:'3600'});
 if(uploaded.error)throw new HttpError(400,uploaded.error.message?.includes('row-level security')?'You cannot add files to this request.':'Unable to upload the attachment. Please retry.');
 const registered=await client.rpc('register_maintenance_attachment',{p_id:id,p_request:requestId,p_path:path,p_name:file.name,p_type:mimeType,p_size:buffer.length});
 if(registered.error){await client.storage.from(maintenanceBucket).remove([path]);throw serviceError(400,'Unable to save the attachment. Please retry.',registered.error);}
 return {id,request_id:requestId,original_name:file.name,mime_type:mimeType,size_bytes:buffer.length,created_at:new Date().toISOString(),uploaded_by:userId};
}
export async function maintenanceAttachmentUrl(client,requestId,attachmentId){
 const item=await client.from('maintenance_attachments').select('id,request_id,storage_path,original_name,mime_type,size_bytes,created_at').eq('id',attachmentId).eq('request_id',requestId).maybeSingle();
 if(item.error||!item.data)throw new HttpError(404,'Attachment not found.');
 const signed=await client.storage.from(maintenanceBucket).createSignedUrl(item.data.storage_path,60);
 if(signed.error||!signed.data?.signedUrl)throw new HttpError(503,'Unable to open the attachment. Please retry.');
 return {...item.data,url:signed.data.signedUrl,expiresIn:60};
}
