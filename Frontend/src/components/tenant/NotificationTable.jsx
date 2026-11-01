import PageSkeleton from "../PageSkeleton.jsx";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, BellRing, CheckCheck, RefreshCw, Wallet, Wrench, X } from "lucide-react";
import { markAllNotificationsRead, markNotificationsRead, updateNotificationEngagement } from "../../lib/notifications.js";
import { useNotificationFeed } from "../../lib/useNotificationFeed.js";
import { closeFromBackdrop } from "../../lib/dialog.js";
import { api } from "../../lib/api.js";

const billingNotice = item => ["bill", "payment", "payment_reminder"].includes(item.kind);
const category = item => billingNotice(item) ? "Payments" : item.kind === "request" ? "Requests" : "Account";
const timestamp = item => new Date(item.created_at).toLocaleString("en-PH", {dateStyle:"medium",timeStyle:"short"});

function NoticeDialog({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog=ref.current, previous=document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} aria-label={title} onCancel={event=>{event.preventDefault();onClose();}} onMouseDown={event=>closeFromBackdrop(event,onClose)}
    className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl backdrop:bg-slate-950/40">
    <div className="mb-4 flex items-start justify-between gap-4"><h2 className="text-xl font-bold">{title}</h2><button autoFocus type="button" onClick={onClose} aria-label="Close notifications" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20}/></button></div>
    {children}
  </dialog>;
}

function NoticeRows({ items, onView }) {
  return items.length ? <div className="space-y-2">{items.map(item=>{
    const Icon=billingNotice(item)?Wallet:category(item)==="Requests"?Wrench:BellRing;
    return <button key={item.id} type="button" onClick={()=>onView(item)} aria-label={`View notification: ${item.title}`}
      className={`group flex w-full items-start gap-3 rounded-xl border border-l-4 p-3 text-left transition-colors sm:items-center sm:gap-4 ${item.is_read?"border-slate-200 bg-white hover:bg-slate-50":"border-blue-200 bg-blue-50/80 hover:bg-blue-100/70"} ${item.alert?"border-l-amber-400":"border-l-blue-600"}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.alert?"bg-amber-50 text-amber-700":"bg-blue-50 text-blue-600"}`}><Icon size={21}/></span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2"><span className={`text-sm leading-5 text-slate-900 ${item.is_read?"font-semibold":"font-bold"}`}>{item.title}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{category(item)}</span></span>
        <span className="mt-1 block line-clamp-2 break-words text-xs leading-5 text-slate-600">{item.message}</span>
        <span className="mt-1 block text-[11px] text-slate-500">{timestamp(item)}{item.alert && <span className="ml-2 font-semibold text-amber-700">{item.alert}</span>}</span>
        <span className="mt-2 inline-flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 sm:hidden">View <ArrowRight size={14}/></span>
      </span>
      {!item.is_read && <span className="mt-3 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600 ring-4 ring-blue-100 sm:mt-0"><span className="sr-only">Unread</span></span>}
      <span className="hidden shrink-0 items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 group-hover:bg-blue-100 sm:inline-flex">View <ArrowRight size={14}/></span>
    </button>;
  })}</div> : <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center"><CheckCheck size={24} className="mx-auto mb-2 text-emerald-600"/><p className="text-sm font-semibold text-slate-700">No notifications yet</p><p className="mt-1 text-xs text-slate-500">Account updates will appear here.</p></div>;
}

export default function NotificationTable({ onNavigate }) {
  const { data, error, loading, reload, more, total, unreadCount, asOf, loadingMore } = useNotificationFeed();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [allOpen,setAllOpen]=useState(false);
  const [selected,setSelected]=useState(null);
  const busy=useRef(false);
  const notices=data||[];
  const view=item=>{setSelected(item);if(!item.seen_at)updateNotificationEngagement(api,[item.id],'seen').catch(()=>undefined);};
  const mark=async ids=>{
    if(busy.current)return;
    busy.current=true;setSaving(true);setSaveError("");
    try{
      if(ids===null)await markAllNotificationsRead(api,asOf);
      else await markNotificationsRead(api,ids);
      setSelected(item=>item && (ids===null||ids.includes(item.id))?{...item,is_read:true}:item);
      reload();
    }catch(e){setSaveError(e.message);}
    finally{busy.current=false;setSaving(false);}
  };
  const content=<>{loading&&!data?<PageSkeleton variant="list" label="Loading notifications..."/>:<NoticeRows items={notices} onView={view}/>}
    {error&&<p role="alert" className="mt-3 text-sm text-rose-700">{error} <button onClick={reload} className="underline">Retry</button></p>}
    {notices.length<total&&<button disabled={loadingMore||loading} onClick={more} className="mt-4 rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50">{loadingMore?"Loading…":"Load more notifications"}</button>}</>;
  return <>
    <section aria-labelledby="notifications-heading" className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <BellRing size={25} className="shrink-0 text-blue-600"/>
        <div className="min-w-0 flex-1"><h2 id="notifications-heading" className="text-lg font-bold text-slate-900">Notifications</h2><p className="text-xs text-slate-500">Your latest account updates</p></div>
        <button type="button" title="Refresh notifications" aria-label="Refresh notifications" disabled={loading||saving} onClick={reload} className="rounded-lg border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={16} className={loading?"animate-spin":""}/></button>
        <button type="button" disabled={!total} onClick={()=>setAllOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">View all <ArrowUpRight size={15}/></button>
      </div>
      <div className="my-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100"><span className="text-xs font-medium text-slate-600">{unreadCount} unread</span><button type="button" disabled={saving||loading||!unreadCount} onClick={()=>mark(null)} className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-blue-700 disabled:opacity-40"><CheckCheck size={15}/>Mark all as read</button></div>
      {loading&&!data?<PageSkeleton variant="list" label="Loading notifications..."/>:<NoticeRows items={notices.slice(0,3)} onView={view}/>}
      {error&&<p role="alert" className="mt-3 text-sm text-rose-700">{error} <button onClick={reload} className="underline">Retry</button></p>}
      {!loading&&total>3&&<p className="mt-3 text-xs text-slate-500">Showing 3 of {total} notifications. Select View all to see the rest.</p>}
      {saveError&&<p role="alert" className="mt-3 text-sm text-rose-700">{saveError}</p>}
    </section>
    {allOpen&&<NoticeDialog title="All notifications" onClose={()=>setAllOpen(false)}>{content}</NoticeDialog>}
    {selected&&<NoticeDialog title={selected.title} onClose={()=>setSelected(null)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{category(selected)}</p>
      {selected.alert&&<p className="mt-3 text-sm font-semibold text-amber-700">{selected.alert}</p>}
      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{selected.message}</p>
      <p className="mt-4 text-xs text-slate-500">{timestamp(selected)}</p>
      {saveError&&<p role="alert" className="mt-3 text-sm text-rose-700">{saveError}</p>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-center gap-2">{selected.is_read?<span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><CheckCheck size={16}/>Read</span>:<button disabled={saving} onClick={()=>mark([selected.id])} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 disabled:opacity-50">{saving?"Saving…":"Mark as read"}</button>}{selected.alert&&!selected.acknowledged_at&&<button disabled={saving} onClick={async()=>{setSaving(true);try{await updateNotificationEngagement(api,[selected.id],'acknowledged');setSelected(item=>({...item,is_read:true,acknowledged_at:new Date().toISOString()}));reload();}catch(e){setSaveError(e.message);}finally{setSaving(false);}}} className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white">Acknowledge</button>}{selected.acknowledged_at&&<span className="text-xs font-semibold text-emerald-700">Acknowledged</span>}</div>
        {billingNotice(selected)&&<button onClick={()=>{setSelected(null);setAllOpen(false);onNavigate?.("billing");}} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">View billing <ArrowRight size={15}/></button>}
      </div>
    </NoticeDialog>}
  </>;
}
