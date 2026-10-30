import { actionConfirmation, showFeedback } from './actionFeedback.js';
import { browserRequest } from './http.js';
import { clearIdleMarker, resetIdleMarker } from './useIdleLogout.js';
import { clearSessionUiState } from './useSessionState.js';
const listeners=new Set(),pendingAuth=new Set(),responseCache=new Map(),inflight=new Map();
let session,refreshing,restoring;
let revision=0;
const changeKey='spartment-auth-change';
// Retire credentials written by the former localStorage-based implementation.
try{localStorage.removeItem('spartment-session');}catch{/* Storage may be disabled. */}
function publish(value){session=value;listeners.forEach(fn=>fn(value));}
function broadcast(){try{localStorage.setItem(changeKey,crypto.randomUUID());}catch{/* Other tabs recheck on their next request. */}}
function clearData(){responseCache.clear();for(const request of inflight.values())request.controller.abort();inflight.clear();}
function clearLocalSession(){revision++;cancelAuth();clearData();clearSessionUiState();publish(null);try{localStorage.removeItem('spartment-session');}catch{/* No credential is retained. */}broadcast();}
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
const temporary=error=>error?.code==='network'||error?.code==='timeout'||[408,425,429,500,502,503,504].includes(error?.status);
const wait=(milliseconds,signal)=>new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(signal.reason);return;}
  const aborted=()=>{clearTimeout(timer);reject(signal.reason);};
  const timer=setTimeout(()=>{signal?.removeEventListener('abort',aborted);resolve();},milliseconds);
  signal?.addEventListener('abort',aborted,{once:true});
});
async function request(path,options={}){
  const {timeoutMs=30000,silent=false,...fetchOptions}=options;
  const announce=!silent&&options.method&&options.method!=='GET';
  const userId=session?.user?.id,current=revision;
  const timedSignal=AbortSignal.timeout(timeoutMs);
  const signal=fetchOptions.signal?AbortSignal.any([fetchOptions.signal,timedSignal]):timedSignal;
  const requestOptions={...fetchOptions,signal,headers:{...fetchOptions.headers,...(userId?{'X-Spartment-User':userId}:{})}};
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
      clearData();
      if(path==='/billing/bills'&&data.bulk)showFeedback(data.message,data.failures.length?'error':data.created?'success':'info');
      else showFeedback(actionConfirmation(path,options.method));
    }
    return data;
  }catch(error){
    if(error.code==='session_changed')void restoreSession();
    if(error.status===401&&unchanged()&&userId){clearLocalSession();showFeedback('Your session has expired. Please sign in again.','info');}
    if(announce)showFeedback(error.message,'error');throw error;
  }
}
async function retryingGet(path,options){
  for(let attempt=0;;attempt++)try{return await request(path,{...options,method:'GET'});}catch(error){
    if(attempt||options.signal?.aborted||error?.name==='AbortError'||!temporary(error))throw error;
    await wait(250,options.signal);
  }
}
function consume(record,signal){
  if(signal?.aborted)return Promise.reject(signal.reason);
  record.consumers++;
  return new Promise((resolve,reject)=>{
    let done=false;
    const release=()=>{if(done)return;done=true;signal?.removeEventListener('abort',aborted);record.consumers--;if(!record.settled&&!record.consumers)record.controller.abort();};
    const aborted=()=>{release();reject(signal.reason);};
    signal?.addEventListener('abort',aborted,{once:true});
    record.promise.then(value=>{if(!done){release();resolve(value);}},error=>{if(!done){release();reject(error);}});
  });
}
function get(path,{signal,cacheMs=0,force=false,timeoutMs=30000}={}){
  if(signal?.aborted)return Promise.reject(signal.reason);
  const key=`${revision}:${session?.user?.id||'public'}:${path}`;
  const cached=responseCache.get(key);
  if(!force&&cached?.expiresAt>Date.now())return Promise.resolve(cached.data);
  if(cached)responseCache.delete(key);
  let record=inflight.get(key);
  // React StrictMode mounts, cleans up, and mounts effects again in development.
  // The first cleanup can abort the shared request before its promise has
  // finished settling. Never attach the remounted effect to that dead request.
  if(record?.controller.signal.aborted){
    if(inflight.get(key)===record)inflight.delete(key);
    record=null;
  }
  if(!record){
    const controller=new AbortController();
    record={controller,consumers:0,settled:false,promise:null};
    record.promise=retryingGet(path,{signal:controller.signal,timeoutMs}).then(data=>{
      if(cacheMs>0)responseCache.set(key,{data,expiresAt:Date.now()+cacheMs});
      return data;
    }).finally(()=>{record.settled=true;if(inflight.get(key)===record)inflight.delete(key);});
    inflight.set(key,record);
  }
  return consume(record,signal);
}
export function api(path,options={}){
  const method=options.method||'GET';
  return method==='GET'?get(path,options):request(path,options);
}
api.get=get;
api.post=(path,body,options={})=>request(path,{...options,method:'POST',body:JSON.stringify(body)});
api.patch=(path,body,options={})=>request(path,{...options,method:'PATCH',body:JSON.stringify(body)});
api.delete=(path,options={})=>request(path,{...options,method:'DELETE',body:'{}'});
api.withSignal=(signal,{force=false}={})=>({
  get:(path,options={})=>get(path,{...options,signal,force:force||options.force}),
  post:(path,body,options={})=>api.post(path,body,{...options,signal}),
  patch:(path,body,options={})=>api.patch(path,body,{...options,signal}),
  delete:(path,options={})=>api.delete(path,{...options,signal}),
});
api.invalidate=clearData;
export const auth={
  clearLocalSession,
  restore:restoreSession,
  subscribe(callback){listeners.add(callback);queueMicrotask(()=>callback(session));if(session===undefined)void restoreSession();return ()=>listeners.delete(callback);},
  async signIn(email,password){
    const current=++revision;cancelAuth();clearData();clearSessionUiState();
    try{const value=await authRequest('/auth/login',{email,password});if(current!==revision)return;publish(value);resetIdleMarker(value?.user?.id);broadcast();showFeedback('You are now signed in.');}
    catch(error){if(error.name!=='AbortError')showFeedback(error.message,'error');throw error;}
  },
  async signOut(message){
    revision++;cancelAuth();
    // Only report local sign-out once the server has cleared its HttpOnly cookies.
    const result=await browserRequest('/auth/logout',{method:'POST',body:'{}'});
    clearIdleMarker();
    clearLocalSession();
    showFeedback(message||(result.revoked?'You have been signed out.':'Signed out on this device. Server session revocation could not be confirmed.'),result.revoked?'success':'info');
  },
};
window.addEventListener('storage',event=>{
  if(event.key===changeKey){revision++;cancelAuth();clearData();clearSessionUiState();restoring=null;refreshing=null;void restoreSession();}
});
