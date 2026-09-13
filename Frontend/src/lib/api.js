import { actionConfirmation, showFeedback } from './actionFeedback.js';
import { browserRequest } from './http.js';
const listeners=new Set(),pendingAuth=new Set();
let session,refreshing,restoring;
let revision=0;
const changeKey='spartment-auth-change';
// Retire credentials written by the former localStorage-based implementation.
try{localStorage.removeItem('spartment-session');}catch{/* Storage may be disabled. */}
function publish(value){session=value;listeners.forEach(fn=>fn(value));}
function broadcast(){try{localStorage.setItem(changeKey,crypto.randomUUID());}catch{/* Other tabs recheck on their next request. */}}
function clearLocalSession(){revision++;cancelAuth();publish(null);try{localStorage.removeItem('spartment-session');}catch{/* No credential is retained. */}broadcast();}
function cancelAuth(){for(const controller of pendingAuth)controller.abort();pendingAuth.clear();}
async function authRequest(path,body={}){
  const controller=new AbortController();pendingAuth.add(controller);
  try{return await browserRequest(path,{method:'POST',body:JSON.stringify(body),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])});}
  finally{pendingAuth.delete(controller);}
}
async function restoreSession(){
  if(restoring)return restoring;
  const current=revision;
  restoring=authRequest('/auth/session').then(value=>{if(current===revision)publish(value);})
    .catch(error=>{if(current===revision&&error.name!=='AbortError')publish({error:error.message});})
    .finally(()=>{restoring=null;});
  return restoring;
}
async function refresh(){
  if(!refreshing){
    const current=revision;
    refreshing=authRequest('/auth/refresh').then(value=>{if(current===revision)publish(value);})
      .catch(error=>{if(error.status===401&&current===revision)clearLocalSession();throw error;})
      .finally(()=>{refreshing=null;});
  }
  return refreshing;
}
export async function api(path,options={}){
  const announce=options.method&&options.method!=='GET';
  const userId=session?.user?.id,current=revision;
  const requestOptions={...options,headers:{...options.headers,...(userId?{'X-Spartment-User':userId}:{})}};
  const unchanged=()=>current===revision&&session?.user?.id===userId;
  try{
    if(session?.user&&session.expires_at*1000<Date.now()+30000)await refresh();
    if(!unchanged())throw new Error('Your session changed. Please retry after signing in.');
    let data;
    try{data=await browserRequest(path,requestOptions);}catch(error){
      if(error.status!==401||!userId)throw error;
      if(!unchanged())throw new Error('Your session changed. Please sign in again.',{cause:error});
      await refresh();
      if(!unchanged())throw new Error('Your session changed. Please sign in again.',{cause:error});
      data=await browserRequest(path,requestOptions);
    }
    if(!unchanged())throw new Error('Your session changed. Please retry after signing in.');
    if(announce){
      if(path==='/billing/bills'&&data.bulk)showFeedback(data.message,data.failures.length?'error':data.created?'success':'info');
      else showFeedback(actionConfirmation(path));
    }
    return data;
  }catch(error){
    if(error.code==='session_changed')void restoreSession();
    if(error.status===401&&unchanged()&&userId){clearLocalSession();showFeedback('Your session has expired. Please sign in again.','info');}
    if(announce)showFeedback(error.message,'error');throw error;
  }
}
api.get=path=>api(path);
api.post=(path,body)=>api(path,{method:'POST',body:JSON.stringify(body)});
api.patch=(path,body)=>api(path,{method:'PATCH',body:JSON.stringify(body)});
export const auth={
  clearLocalSession,
  restore:restoreSession,
  subscribe(callback){listeners.add(callback);queueMicrotask(()=>callback(session));if(session===undefined)void restoreSession();return ()=>listeners.delete(callback);},
  async signIn(email,password){
    const current=++revision;cancelAuth();
    try{const value=await authRequest('/auth/login',{email,password});if(current!==revision)return;publish(value);broadcast();showFeedback('You are now signed in.');}
    catch(error){if(error.name!=='AbortError')showFeedback(error.message,'error');throw error;}
  },
  async signOut(){
    revision++;cancelAuth();
    // Only report local sign-out once the server has cleared its HttpOnly cookies.
    const result=await browserRequest('/auth/logout',{method:'POST',body:'{}'});
    clearLocalSession();
    showFeedback(result.revoked?'You have been signed out.':'Signed out on this device. Server session revocation could not be confirmed.',result.revoked?'success':'info');
  },
};
window.addEventListener('storage',event=>{
  if(event.key===changeKey){revision++;cancelAuth();restoring=null;refreshing=null;void restoreSession();}
});
