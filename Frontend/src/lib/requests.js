export const submitTenantRequest=(client,kind,form,id)=>client.post('/requests/submit',{kind,form,id});
export const submitInquiry=(client,form,id)=>client.post('/public/inquiries',{form,id});
export const loadRequests=client=>client.get('/requests');
export const uploadRequestAttachment=(client,requestId,file)=>client.upload(`/requests/${requestId}/attachments?name=${encodeURIComponent(file.name)}`,file,{silent:true});
export const loadRequestAttachmentUrl=(client,requestId,attachmentId)=>client.get(`/requests/${requestId}/attachments/${attachmentId}`,{force:true});
