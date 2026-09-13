export const money = value => new Intl.NumberFormat('en-PH', { style:'currency', currency:'PHP' }).format(Number(value || 0));
export const today = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const loadBills=client=>client.get('/billing');
export const loadBillingOverview=client=>client.get('/billing?view=overview');
export const createBill=(client,form)=>client.post('/billing/bills',form);
export const recordPayment=(client,bill,form,id)=>client.post('/billing/payments',{billId:bill.id,form,id});
