export const submitTenantRequest=(client,kind,form,id)=>client.post('/requests/submit',{kind,form,id});
export const submitInquiry=(client,form,id)=>client.post('/public/inquiries',{form,id});
export const loadRequests=client=>client.get('/requests');
