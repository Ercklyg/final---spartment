import { useEffect, useRef, useState } from 'react';
import { BellRing, X, Wallet, CalendarClock, Wrench, DoorOpen, MessageSquare, Layers, RefreshCw, ArrowUpRight, ArrowRight, CheckCheck } from 'lucide-react';
import { useRemoteData } from '../../lib/useRemoteData.js';
import { useSessionState } from '../../lib/useSessionState.js';
import { closeFromBackdrop } from '../../lib/dialog.js';
import './AdminNotifications.css';

const load = client => client.get('/notifications/admin');
const categories = ['All', 'Payments', 'Leases', 'Requests', 'Rooms', 'Inquiries'];
const colors = { High: 'bg-rose-50 text-rose-700', Normal: 'bg-amber-50 text-amber-800', Informational: 'bg-blue-50 text-blue-700' };
const rowAccent = { High: 'border-l-rose-500', Normal: 'border-l-amber-400', Informational: 'border-l-blue-600' };
const icons = { All: Layers, Payments: Wallet, Leases: CalendarClock, Requests: Wrench, Rooms: DoorOpen, Inquiries: MessageSquare };
const noticeVersion = item => JSON.stringify([item.id, item.title, item.text, item.priority, item.deadline, item.time]);

function CategoryButtons({ notices, selected, onSelect, disabled, seen }) {
  return <div role="group" aria-label="Notification categories" className="admin-notification-categories mt-5"><div className="admin-notification-category-grid gap-1.5 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
    {categories.map(category => {
      const count = category === 'All' ? notices.length : notices.filter(item => item.category === category).length;
      const active = selected === category;
      const Icon = icons[category];
      const hasNew = category !== 'All' && notices.some(item => item.category === category && seen[item.id] !== noticeVersion(item));
      return <button key={category} type="button" aria-label={`${category}: ${count} notifications`} title={`${category}: ${count} notifications`} aria-pressed={active} disabled={disabled} onClick={() => onSelect(category)}
        className={`relative inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 overflow-visible rounded-xl border px-2 py-1.5 text-xs font-semibold transition-[background-color,border-color,color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 ${active ? 'border-blue-200 bg-gradient-to-b from-white to-blue-50 text-blue-700 shadow-[0_3px_10px_-5px_rgba(37,99,235,0.55)]' : count ? 'border-transparent text-slate-700 hover:border-blue-100 hover:bg-white hover:text-blue-700' : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-white'}`}>
        <span className={`admin-notification-category-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${active?'bg-blue-100 text-blue-700':count?'bg-slate-100 text-slate-600':'bg-slate-100/70 text-slate-400'}`}><Icon size={14} aria-hidden="true" /></span><span className="admin-notification-category-label min-w-0 truncate">{category}</span>{count>0&&<span className="relative inline-flex shrink-0"><span className={`inline-flex min-w-5 items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${active ? 'bg-blue-600 text-white' : 'bg-slate-200/80 text-slate-600'}`}>{count}</span>{hasNew&&<span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"><span className="sr-only">New notifications</span></span>}</span>}{active&&<span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-blue-600"/>}
      </button>;
    })}
  </div></div>;
}

function NotificationDetails({ item, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element.open) element.showModal();
    return () => element.close();
  }, []);
  // StrictMode replays effect cleanup, which dispatches a native close event.
  // Only user cancellation should clear the selected notification.
  return <dialog ref={dialog} onMouseDown={event=>closeFromBackdrop(event,onClose)} onCancel={event => { event.preventDefault(); onClose(); }} aria-labelledby="notification-detail-title" className="fixed inset-0 m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-slate-950/40">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold text-blue-600">{item.category}</p><h2 id="notification-detail-title" className="mt-2 text-lg font-bold">{item.title}</h2></div><button autoFocus type="button" onClick={onClose} aria-label="Close notification details" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div>
    <span className={`mt-4 inline-block rounded-full px-2 py-1 text-xs font-semibold ${colors[item.priority]}`}>{item.priority}</span>
    <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">{item.text}</p>
    <p className="mt-4 text-xs text-slate-500">{item.time}</p>
    <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4"><span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><CheckCheck size={16} />Read</span><button type="button" onClick={onClose} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Done</button></div>
  </dialog>;
}

function NoticeList({ items, seen, onView }) {
  return items.length ? items.map(item => {
    const Icon = icons[item.category] || BellRing;
    const unread = seen[item.id] !== noticeVersion(item);
    return <button key={item.id} type="button" onClick={() => onView(item)} aria-label={`View notification: ${item.title}`} className={`group relative flex w-full min-w-0 items-start gap-2 rounded-xl border border-l-4 p-2.5 pr-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:items-center sm:gap-4 sm:p-3 ${unread ? 'border-blue-200 bg-blue-50/80 hover:bg-blue-100/70' : 'border-slate-200 bg-white hover:bg-slate-50'} ${rowAccent[item.priority] || rowAccent.Informational}`}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12 sm:rounded-xl ${colors[item.priority] || colors.Informational}`}><Icon size={20} strokeWidth={1.8} className="sm:h-[22px] sm:w-[22px]" /></span>
      <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-1.5 sm:gap-2"><span className={`block text-sm leading-5 text-slate-900 sm:text-base ${unread ? 'font-bold' : 'font-semibold'}`}>{item.title}</span><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide sm:text-[10px] ${unread ? 'bg-white/80 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{item.category}</span></span><span className={`mt-0.5 block break-words text-xs leading-5 sm:text-sm ${unread ? 'font-medium text-slate-700' : 'text-slate-500'}`}>{item.text}</span><span className={`mt-1 block text-[10px] font-medium sm:text-[11px] ${unread ? 'text-blue-600' : 'text-slate-500'}`}>{item.time} · {item.priority}</span></span>
      {unread && <span className="absolute left-9 top-2 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600 ring-2 ring-blue-100 sm:static sm:mt-0 sm:h-3 sm:w-3 sm:ring-4"><span className="sr-only">Unread notification</span></span>}
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-xs font-semibold text-blue-700 transition-colors group-hover:bg-blue-100 sm:mt-0 sm:h-auto sm:w-auto sm:gap-1 sm:px-2.5 sm:py-1.5"><span className="sr-only sm:not-sr-only">View</span><ArrowRight size={14} /></span>
    </button>;
  }) : <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center"><span className="mb-3 rounded-full bg-emerald-50 p-3 text-emerald-600"><CheckCheck size={23} /></span><p className="text-sm font-semibold text-slate-700">You're all caught up</p><p className="mt-1 text-xs text-slate-500">No notifications in this category.</p></div>;
}

export default function AdminNotifications() {
  const { data, error, loading, reload } = useRemoteData(load);
  const reloadRef=useRef(reload);
  useEffect(()=>{reloadRef.current=reload;},[reload]);
  useEffect(()=>{const timer=setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine)reloadRef.current();},30000);return()=>clearInterval(timer);},[]);
  const notices = data || [];
  const [isAllOpen, setIsAllOpen] = useState(false);
  const [category, setCategory] = useState('All');
  const [seen, setSeen] = useSessionState('admin-notification-seen', {});
  const [viewed, setViewed] = useState(null);
  const selectCategory = setCategory;
  const viewNotice = item => {
    setViewed(item);
    setSeen(previous => ({ ...previous, [item.id]: noticeVersion(item) }));
  };
  const filtered = category === 'All' ? notices : notices.filter(item => item.category === category);
  return <>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap sm:items-center sm:gap-4">
        <BellRing size={25} className="mt-0.5 shrink-0 text-blue-600 sm:mt-0" />
        <div className="min-w-0 flex-1"><h2 className="text-lg font-bold leading-tight text-slate-900 sm:text-xl">Admin Notifications</h2><p className="text-xs leading-5 text-slate-500 sm:text-sm">Important property updates and items that need your attention.</p></div>
        <button type="button" title="Refresh notifications" aria-label="Refresh notifications" disabled={loading} onClick={reload} className="rounded-lg border border-slate-200 p-2.5 text-slate-500 transition-colors hover:bg-slate-50 focus-visible:outline-blue-600 disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
        <button type="button" disabled={!notices.length} onClick={() => setIsAllOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50">View all <ArrowUpRight size={15} /></button>
      </div>
      {error && data && <p role="alert" className="mt-3 text-sm text-rose-700">{error} Showing previously loaded notifications.</p>}
      <CategoryButtons notices={notices} selected={category} onSelect={selectCategory} seen={seen} disabled={!data && (loading || Boolean(error))} />
      <div className="mt-4 space-y-2">{loading && !data ? <p role="status" className="py-5 text-sm text-slate-500">Loading notifications…</p> : error && !data ? <p role="alert" className="py-5 text-sm text-rose-700">{error}</p> : <NoticeList items={filtered.slice(0, 5)} seen={seen} onView={viewNotice} />}</div>
      {data && filtered.length > 5 && <p className="mt-2 text-xs text-slate-500">Showing 5 of {filtered.length} {category === 'All' ? 'notifications' : category.toLowerCase()}. Select View all to see the rest.</p>}
    </section>
    {isAllOpen && <div role="dialog" aria-modal="true" aria-labelledby="all-notifications-title" onMouseDown={event=>closeFromBackdrop(event,()=>setIsAllOpen(false))} onKeyDown={event => { if (event.key === 'Escape') setIsAllOpen(false); }} className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4">
      <div className="flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="shrink-0 px-4 pb-4 pt-5 sm:px-5"><div className="flex items-start justify-between gap-4"><div><h2 id="all-notifications-title" className="text-xl font-bold">All notifications</h2><p className="mt-1 text-sm text-slate-500">Current alerts across your properties, ordered by priority.</p></div><button autoFocus type="button" onClick={() => setIsAllOpen(false)} aria-label="Close notifications" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div>
        <CategoryButtons notices={notices} selected={category} onSelect={selectCategory} seen={seen} disabled={loading || Boolean(error)} />
        </div><div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 pb-5 sm:px-5"><NoticeList items={filtered} seen={seen} onView={viewNotice} /></div>
      </div>
    </div>}
    {viewed && <NotificationDetails item={viewed} onClose={() => setViewed(null)} />}
  </>;
}
