import { Bell, BellRing, Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { loadNotificationPreferences, saveNotificationPreferences } from '../../lib/notifications.js';

const choices=[['billing_enabled','Bills'],['payment_enabled','Payments'],['request_enabled','Requests'],['account_enabled','Account']];
export default function NotificationPreferences(){
  const [value,setValue]=useState(null),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
  useEffect(()=>{loadNotificationPreferences(api).then(setValue).catch(e=>setMessage(e.message));},[]);
  if(!value)return <p className="text-xs text-slate-500">{message||'Loading notification preferences…'}</p>;
  const save=async next=>{setValue(next);setSaving(true);setMessage('');try{setValue(await saveNotificationPreferences(api,next));setMessage('Preferences saved.');}catch(e){setMessage(e.message);}finally{setSaving(false);}};
  const toggle=key=>save({...value,[key]:!value[key]});
  const browser=async()=>{if(!('Notification'in window)){setMessage('Browser notifications are not supported on this device.');return;}const permission=await Notification.requestPermission();save({...value,browser_enabled:permission==='granted'});};
  return <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex items-center gap-2"><BellRing size={17} className="text-blue-600"/><strong className="text-sm">Notification preferences</strong></div><div className="mt-3 flex flex-wrap gap-2">{choices.map(([key,label])=><button type="button" key={key} onClick={()=>toggle(key)} disabled={saving} aria-pressed={value[key]} className={`min-h-10 rounded-lg border px-3 text-xs font-semibold ${value[key]?'border-blue-200 bg-blue-50 text-blue-700':'border-slate-200 bg-white text-slate-500'}`}>{label}</button>)}</div><div className="mt-3 grid gap-2 sm:grid-cols-2"><button type="button" onClick={()=>toggle('sound_enabled')} disabled={saving} className="flex min-h-10 items-center justify-center gap-2 rounded-lg border bg-white text-xs font-semibold"><Volume2 size={15}/>{value.sound_enabled?'Sound on':'Sound off'}</button><button type="button" onClick={browser} disabled={saving} className="flex min-h-10 items-center justify-center gap-2 rounded-lg border bg-white text-xs font-semibold"><Bell size={15}/>{value.browser_enabled?'Browser alerts on':'Enable browser alerts'}</button></div>{message&&<p role="status" className="mt-2 text-xs text-slate-600">{message}</p>}<p className="mt-2 text-[11px] text-slate-500">Browser alerts work while Spartment is open. Closed-browser push requires server push credentials.</p></div>;
}
