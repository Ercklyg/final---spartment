let messages=[];
const listeners=new Set();
const emit=()=>listeners.forEach(listener=>listener());
export const subscribeFeedback=listener=>{listeners.add(listener);return ()=>listeners.delete(listener);};
export const getFeedback=()=>messages;
export function dismissFeedback(id){messages=messages.filter(message=>message.id!==id);emit();}
export function showFeedback(message,type='success'){
  const duplicate=messages.find(item=>item.message===message&&item.type===type);
  if(duplicate)return;
  const id=crypto.randomUUID();
  messages=[...messages.slice(-3),{id,message,type}];emit();
  // Automatically dismiss every pop-up, including errors, after three seconds.
  setTimeout(()=>dismissFeedback(id),3000);
}
const confirmations={
  '/rooms':'Room added successfully.',
  '/tenants':'Tenant account created and room assigned successfully.',
  '/billing/bills':'Bill created successfully.',
  '/billing/payments':'Payment recorded successfully.',
  '/payments/corrections':'Payment correction saved. The audit history and tenant notification were updated.',
  '/requests/submit':'Your request was submitted successfully.',
  '/public/inquiries':'Your inquiry was submitted successfully.',
  '/notifications/read':'Notifications marked as read.',
  '/auth/password':'Your password was changed successfully.',
};
export function actionConfirmation(path){
  if(confirmations[path])return confirmations[path];
  if(/^\/rooms\/[^/]+\/status$/.test(path))return 'Room status updated successfully.';
  if(/^\/requests\/[^/]+$/.test(path))return 'Request update saved and the tenant notified.';
  if(/^\/inquiries\/[^/]+$/.test(path))return 'Inquiry status updated successfully.';
  return 'Changes saved successfully.';
}
