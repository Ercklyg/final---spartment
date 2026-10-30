import { useEffect, useRef, useState } from 'react';
import { BellRing, X, Wallet, CalendarClock, Wrench, DoorOpen, MessageSquare, Layers, RefreshCw, ArrowUpRight, CheckCheck } from 'lucide-react';
import { useRemoteData } from '../../lib/useRemoteData.js';
import { useSessionState } from '../../lib/useSessionState.js';

const load = client => client.get('/notifications/admin');
const categories = ['All', 'Payments', 'Leases', 'Requests', 'Rooms', 'Inquiries'];
const colors = { High: 'bg-rose-50 text-rose-700', Normal: 'bg-amber-50 text-amber-800', Informational: 'bg-blue-50 text-blue-700' };
const icons = { All: Layers, Payments: Wallet, Leases: CalendarClock, Requests: Wrench, Rooms: DoorOpen, Inquiries: MessageSquare };
const noticeVersion = item => JSON.stringify([item.id, item.title, item.text, item.priority, item.deadline, item.time]);

function CategoryButtons({ notices, selected, onSelect, disabled, seen }) {
  return <div role="group" aria-label="Notification categories" className="mt-5 flex flex-wrap gap-1.5 rounded-xl bg-slate-50 p-1.5 ring-1 ring-slate-100">
    {categories.map(category => {
      const count = category === 'All' ? notices.length : notices.filter(item => item.category === category).length;
      const active = selected === category;
      const Icon = icons[category];
      const hasNew = category !== 'All' && notices.some(item => item.category === category && seen[item.id] !== noticeVersion(item));
      return <button key={category} type="button" aria-pressed={active} disabled={disabled} onClick={() => onSelect(category)}
        className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 ${active ? 'border-blue-100 bg-white text-blue-700 shadow-sm' : count ? 'border-transparent text-slate-600 hover:bg-white hover:text-slate-900' : 'border-transparent text-slate-400 hover:bg-white'}`}>
        <Icon size={15} aria-hidden="true" />{category}<span className={`min-w-5 rounded-md px-1.5 py-0.5 text-center text-[10px] tabular-nums ${active ? 'bg-blue-600 text-white' : 'bg-slate-200/60 text-slate-500'}`}>{count}</span>
        {hasNew && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500 ring-2 ring-white"><span className="sr-only">New notifications</span></span>}
      </button>;
    })}
  </div>;
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
  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); onClose(); }} aria-labelledby="notification-detail-title" className="fixed inset-0 m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-slate-950/40">
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
    return <div key={item.id} className={`flex min-w-0 items-start gap-3 rounded-xl border p-4 transition-colors sm:gap-4 ${unread ? 'border-blue-100 bg-blue-50/60 shadow-[inset_3px_0_0_#3b82f6]' : 'border-slate-100 bg-white'}`}>
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors[item.priority]}`}><Icon size={19} strokeWidth={1.8} /></span>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-900">{item.title}</h3><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${colors[item.priority]}`}><span className="h-1 w-1 rounded-full bg-current" />{item.priority}</span></div>
      <p className="mt-1.5 break-words text-xs leading-relaxed text-slate-500 sm:text-sm">{item.text}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] font-medium text-slate-400">{item.time}</p><div className="flex items-center gap-3"><span className={`text-[10px] font-semibold ${unread ? 'text-blue-600' : 'text-slate-400'}`}>{unread ? 'Unread' : 'Read'}</span><button type="button" onClick={() => onView(item)} aria-label={`View notification: ${item.title}`} className="inline-flex items-center gap-1 rounded-lg border border-blue-100 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 focus-visible:outline-blue-600">View <ArrowUpRight size={13} /></button></div></div>
    </div>
  </div>;
  }) : <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center"><span className="mb-3 rounded-full bg-emerald-50 p-3 text-emerald-600"><CheckCheck size={23} /></span><p className="text-sm font-semibold text-slate-700">You're all caught up</p><p className="mt-1 text-xs text-slate-500">No notifications in this category.</p></div>;
}

export default function AdminNotifications() {
  const { data, error, loading, reload } = useRemoteData(load);
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
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_24px_rgba(15,23,42,0.04)] sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><BellRing size={22} strokeWidth={1.8} /></span>
        <div className="min-w-0 flex-1"><h2 className="text-lg font-bold tracking-tight text-slate-900">Notifications</h2><p className="mt-0.5 text-xs text-slate-500">Your property updates, with urgent items first.</p></div>
        <button type="button" title="Refresh notifications" aria-label="Refresh notifications" disabled={loading} onClick={reload} className="rounded-lg border border-slate-200 p-2.5 text-slate-500 transition-colors hover:bg-slate-50 focus-visible:outline-blue-600 disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
        <button type="button" disabled={!notices.length} onClick={() => setIsAllOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50">View all <ArrowUpRight size={15} /></button>
      </div>
      <CategoryButtons notices={notices} selected={category} onSelect={selectCategory} seen={seen} disabled={loading || Boolean(error)} />
      <div className="mt-4 space-y-2">{loading ? <p role="status" className="py-5 text-sm text-slate-500">Loading notifications…</p> : error ? <p role="alert" className="py-5 text-sm text-rose-700">{error}</p> : <NoticeList items={filtered.slice(0, 5)} seen={seen} onView={viewNotice} />}</div>
      {!loading && !error && filtered.length > 5 && <p className="mt-2 text-xs text-slate-500">Showing 5 of {filtered.length} {category === 'All' ? 'notifications' : category.toLowerCase()}. Select View all to see the rest.</p>}
    </section>
    {isAllOpen && <div role="dialog" aria-modal="true" aria-labelledby="all-notifications-title" onKeyDown={event => { if (event.key === 'Escape') setIsAllOpen(false); }} className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><h2 id="all-notifications-title" className="text-xl font-bold">All notifications</h2><p className="mt-1 text-sm text-slate-500">Current alerts across your properties, ordered by priority.</p></div><button autoFocus type="button" onClick={() => setIsAllOpen(false)} aria-label="Close notifications" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div>
        <CategoryButtons notices={notices} selected={category} onSelect={selectCategory} seen={seen} disabled={loading || Boolean(error)} />
        <div className="mt-4 space-y-2"><NoticeList items={filtered} seen={seen} onView={viewNotice} /></div>
      </div>
    </div>}
    {viewed && <NotificationDetails item={viewed} onClose={() => setViewed(null)} />}
  </>;
}
