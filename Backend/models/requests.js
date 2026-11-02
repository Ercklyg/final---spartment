import { readAll } from './readAll.js';
import { serviceError } from '../middleware/errors.js';

export async function submitTenantRequest(client,kind,form,id) {
  // The API authenticates the caller; the RPC enforces tenant authorization.
  const {error}=await client.rpc('submit_tenant_request',{p_id:id,p_kind:kind,p_subject:(kind==='maintenance'?form.issue:form.subject).trim(),p_message:(kind==='maintenance'?form.description:form.message).trim(),p_priority:kind==='maintenance'?form.priority:'Normal'});
  if(error)throw serviceError(400,'Unable to submit the request. Please retry.',error);
}
export async function submitInquiry(client,form,id) {
  const {error}=await client.from('inquiries').insert({id,full_name:form.fullName.trim(),email:form.email.trim().toLowerCase(),phone:form.contact.trim(),preferred_room:form.preferredRoom.trim(),move_in_date:form.moveInDate || null,message:form.message.trim()});
  if(error&&error.code!=='23505')throw new Error('Unable to submit inquiry. Please retry.');
}
export async function loadRequests(client) {
  return readAll(()=>client.from('tenant_requests').select('*, profiles(full_name), rooms(room_number,buildings(name)), maintenance_attachments(id,original_name,mime_type,size_bytes,created_at,uploaded_by)').order('created_at',{ascending:false}).order('id'));
}
