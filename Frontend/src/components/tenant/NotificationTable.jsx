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
const noticeTones = {
  payment: { unread:"border-emerald-200 bg-emerald-50/70 hover:border-emerald-300 hover:bg-emerald-50", accent:"border-l-emerald-500", icon:"bg-emerald-100/80 text-emerald-700 ring-emerald-200", badge:"bg-emerald-50 text-emerald-700", label:"text-emerald-700" },
  bill: { unread:"border-blue-200 bg-blue-50/60 hover:border-blue-300 hover:bg-blue-50", accent:"border-l-blue-600", icon:"bg-blue-100/70 text-blue-600 ring-blue-200", badge:"bg-blue-50 text-blue-700", label:"text-blue-700" },
  request: { unread:"border-orange-200 bg-orange-50/70 hover:border-orange-300 hover:bg-orange-50", accent:"border-l-orange-500", icon:"bg-orange-100/80 text-orange-700 ring-orange-200", badge:"bg-orange-50 text-orange-700", label:"text-orange-700" },
  account: { unread:"border-violet-200 bg-violet-50/70 hover:border-violet-300 hover:bg-violet-50", accent:"border-l-violet-500", icon:"bg-violet-100/80 text-violet-700 ring-violet-200", badge:"bg-violet-50 text-violet-700", label:"text-violet-700" },
  warning: { unread:"border-amber-200 bg-amber-50/70 hover:border-amber-300 hover:bg-amber-50", accent:"border-l-amber-500", icon:"bg-amber-100/80 text-amber-700 ring-amber-200", badge:"bg-amber-50 text-amber-700", label:"text-amber-700" },
  danger: { unread:"border-rose-200 bg-rose-50/70 hover:border-rose-300 hover:bg-rose-50", accent:"border-l-rose-500", icon:"bg-rose-100/80 text-rose-700 ring-rose-200", badge:"bg-rose-50 text-rose-700", label:"text-rose-700" },
};
const toneFor = item => noticeTones[item.alert === "Payment overdue" ? "danger" : item.alert ? "warning" : item.kind === "payment" ? "payment" : item.kind === "bill" || item.kind === "payment_reminder" ? "bill" : item.kind === "request" ? "request" : "account"];

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
  return items.length ? <div className="space-y-2.5">{items.map(item=>{
    const Icon=billingNotice(item)?Wallet:category(item)==="Requests"?Wrench:BellRing;
    const tone=toneFor(item);
    return <button key={item.id} type="button" onClick={()=>onView(item)} aria-label={`View notification: ${item.title}`}
      className={`group flex w-full items-start gap-3 rounded-xl border border-l-[3px] px-3.5 py-3 text-left shadow-sm transition-[border-color,background-color,box-shadow] sm:items-center sm:gap-4 sm:px-4 ${item.is_read?`border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 ${tone.accent}`:`${tone.unread} ${tone.accent} hover:shadow-md`}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${tone.icon} ${item.is_read?"opacity-70":""}`}><Icon size={20}/></span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5"><span className={`text-sm leading-5 text-slate-900 ${item.is_read?"font-semibold":"font-bold"}`}>{item.title}</span>{!item.is_read&&<span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-white ${item.alert === "Payment overdue"?"bg-rose-600":item.alert?"bg-amber-600":item.kind === "payment"?"bg-emerald-600":item.kind === "request"?"bg-orange-600":item.kind === "bill"?"bg-blue-600":"bg-violet-600"}`}>Unread</span>}<span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] ${tone.badge}`}>{category(item)}</span></span>
        <span className="mt-1 block line-clamp-2 break-words text-xs leading-5 text-slate-600">{item.message}</span>
        <span className="mt-1.5 block text-[11px] text-slate-500">{timestamp(item)}{item.alert && <span className={`ml-2 font-semibold ${tone.label}`}>{item.alert}</span>}</span>
        <span className="mt-2.5 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm sm:hidden">View details <ArrowRight size={14}/></span>
      </span>
      <span className="hidden shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 shadow-sm transition group-hover:border-blue-200 group-hover:bg-blue-600 group-hover:text-white sm:inline-flex">View <ArrowRight size={14}/></span>
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
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100"><BellRing size={22}/></span>
        <div className="min-w-0 flex-1"><h2 id="notifications-heading" className="text-lg font-bold text-slate-900">Notifications</h2><p className="text-xs text-slate-500">Your latest account updates</p></div>
        <button type="button" title="Refresh notifications" aria-label="Refresh notifications" disabled={loading||saving} onClick={reload} className="rounded-lg border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={16} className={loading?"animate-spin":""}/></button>
        <button type="button" disabled={!total} onClick={()=>setAllOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">View all <ArrowUpRight size={15}/></button>
      </div>
      <div className="my-4 flex min-h-10 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5"><span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700"><span className="h-2 w-2 rounded-full bg-blue-600"/>{unreadCount} unread</span><button type="button" disabled={saving||loading||!unreadCount} onClick={()=>mark(null)} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-40"><CheckCheck size={15}/>Mark all as read</button></div>
      {loading&&!data?<PageSkeleton variant="list" label="Loading notifications..."/>:<NoticeRows items={notices.slice(0,3)} onView={view}/>}
      {error&&<p role="alert" className="mt-3 text-sm text-rose-700">{error} <button onClick={reload} className="underline">Retry</button></p>}
      {!loading&&total>3&&<p className="mt-3 text-xs text-slate-500">Showing 3 of {total} notifications. Select View all to see the rest.</p>}
      {saveError&&<p role="alert" className="mt-3 text-sm text-rose-700">{saveError}</p>}
    </section>
    {allOpen&&<NoticeDialog title="All notifications" onClose={()=>setAllOpen(false)}>{content}</NoticeDialog>}
    {selected&&<NoticeDialog title={selected.title} onClose={()=>setSelected(null)}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${toneFor(selected).label}`}>{category(selected)}</p>
      {selected.alert&&<p className={`mt-3 text-sm font-semibold ${toneFor(selected).label}`}>{selected.alert}</p>}
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
