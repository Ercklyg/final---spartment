import webpush from 'web-push';
import { HttpError } from '../middleware/errors.js';

const configured=()=>Boolean(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY&&process.env.VAPID_SUBJECT);
const category={bill:'billing_enabled',payment:'payment_enabled',request:'request_enabled',account:'account_enabled'};
const cleanupInterval=24*60*60*1000,deliveryRetention=90*24*60*60*1000;
let lastCleanup=0;

function configure(){
 if(!configured())return false;
 webpush.setVapidDetails(process.env.VAPID_SUBJECT,process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
 return true;
}

export const pushPublicKey=()=>({enabled:configured(),publicKey:configured()?process.env.VAPID_PUBLIC_KEY:null});

export async function savePushSubscription(client,userId,body,userAgent){
 const endpoint=String(body?.endpoint||''),p256dh=String(body?.keys?.p256dh||''),auth=String(body?.keys?.auth||'');
 if(endpoint.length<20||endpoint.length>2048||p256dh.length<20||p256dh.length>512||auth.length<8||auth.length>256)throw new HttpError(400,'Invalid browser push subscription.');
 const {data,error}=await client.from('push_subscriptions').upsert({user_id:userId,endpoint,p256dh,auth,user_agent:String(userAgent||'').slice(0,500),updated_at:new Date().toISOString()},{onConflict:'endpoint'}).select('id').single();
 if(error)throw new HttpError(503,'Unable to save this device for notifications.');
 return {ok:true,id:data.id};
}

export async function removePushSubscription(client,userId,endpoint){
 if(typeof endpoint!=='string'||endpoint.length<20)throw new HttpError(400,'Invalid browser push subscription.');
 const {error}=await client.from('push_subscriptions').delete().eq('user_id',userId).eq('endpoint',endpoint);
 if(error)throw new HttpError(503,'Unable to remove this device.');
 return {ok:true};
}

export async function deliverPendingPushes(client){
 if(!configure())return {enabled:false,sent:0};
 if(Date.now()-lastCleanup>=cleanupInterval){
  const cutoff=new Date(Date.now()-deliveryRetention).toISOString();
  const cleanup=await client.from('push_deliveries').delete().lt('delivered_at',cutoff);
  if(!cleanup.error)lastCleanup=Date.now();
 }
 const since=new Date(Date.now()-5*60*1000).toISOString();
 const notices=await client.from('notifications').select('id,tenant_id,title,message,kind,source_id,created_at').gte('created_at',since).order('created_at');
 if(notices.error)throw new HttpError(503,'Unable to prepare push notifications.');
 if(!notices.data.length)return {enabled:true,sent:0};
 const users=[...new Set(notices.data.map(item=>item.tenant_id))];
 const [devices,preferences,deliveries]=await Promise.all([
  client.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth').in('user_id',users),
  client.from('notification_preferences').select('user_id,browser_enabled,billing_enabled,payment_enabled,request_enabled,account_enabled').in('user_id',users),
  client.from('push_deliveries').select('notification_id,subscription_id').in('notification_id',notices.data.map(item=>item.id)),
 ]);
 if(devices.error||preferences.error||deliveries.error)throw new HttpError(503,'Unable to prepare push notifications.');
 const prefs=new Map(preferences.data.map(item=>[item.user_id,item]));
 const sent=new Set(deliveries.data.map(item=>`${item.notification_id}:${item.subscription_id}`));
 let count=0;
 for(const notice of notices.data){
  const preference=prefs.get(notice.tenant_id),field=category[notice.kind]||'account_enabled';
  if(preference?.[field]===false)continue;
  for(const device of devices.data.filter(item=>item.user_id===notice.tenant_id)){
   const key=`${notice.id}:${device.id}`;if(sent.has(key))continue;
   const claimed=await client.from('push_deliveries').insert({notification_id:notice.id,subscription_id:device.id});
   if(claimed.error){if(claimed.error.code==='23505')continue;throw new HttpError(503,'Unable to record push delivery.');}
   try{
    await webpush.sendNotification({endpoint:device.endpoint,keys:{p256dh:device.p256dh,auth:device.auth}},JSON.stringify({title:notice.title,body:notice.message,url:'/?page=dashboard',tag:`spartment-${notice.id}`}),{TTL:3600,urgency:'normal'});count++;
   }catch(error){
    if([404,410].includes(error.statusCode))await client.from('push_subscriptions').delete().eq('id',device.id);
    else await client.from('push_deliveries').delete().eq('notification_id',notice.id).eq('subscription_id',device.id);
   }
  }
 }
 return {enabled:true,sent:count};
}
