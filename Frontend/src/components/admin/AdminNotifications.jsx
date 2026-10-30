import { useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { useRemoteData } from '../../lib/useRemoteData.js';

const load = client => client.get('/notifications/admin');
const categories = ['All', 'Payments', 'Leases', 'Requests', 'Rooms', 'Inquiries'];
const colors = { High: 'bg-rose-50 text-rose-700', Normal: 'bg-amber-50 text-amber-800', Informational: 'bg-blue-50 text-blue-700' };

function NoticeList({ items }) {
  return items.length ? items.map(item => <div key={item.id} className="flex min-w-0 items-start gap-3 border-b border-slate-200 py-3 last:border-0">
    <span className={`rounded-lg p-2 ${colors[item.priority]}`}><BellRing size={20} /></span>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{item.title}</h3><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${colors[item.priority]}`}>{item.priority}</span></div>
      <p className="mt-1 text-sm text-slate-600">{item.text}</p>
      <p className="mt-1 text-xs text-slate-500">{item.time}</p>
    </div>
  </div>) : <p className="py-5 text-sm text-slate-500">No notifications in this category.</p>;
}

export default function AdminNotifications() {
  const { data, error, loading, reload } = useRemoteData(load);
  const notices = data || [];
  const [isAllOpen, setIsAllOpen] = useState(false);
  const [category, setCategory] = useState('All');
  const filtered = category === 'All' ? notices : notices.filter(item => item.category === category);
  return <>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <BellRing className="text-blue-600" size={25} />
        <div className="min-w-0 flex-1"><h2 className="text-lg font-bold">Notifications</h2><p className="text-xs text-slate-500">Priority first, then deadline. Other updates appear newest first.</p></div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-600">{notices.length} updates</span>
        <button type="button" disabled={loading} onClick={reload} className="text-sm text-blue-600 disabled:opacity-50">Refresh</button>
        <button type="button" disabled={!notices.length} onClick={() => setIsAllOpen(true)} className="text-sm text-blue-600 disabled:opacity-50">View all →</button>
      </div>
      <div className="mt-3">{loading ? <p role="status" className="py-5 text-sm text-slate-500">Loading notifications…</p> : error ? <p role="alert" className="py-5 text-sm text-rose-700">{error}</p> : <NoticeList items={notices.slice(0, 5)} />}</div>
    </section>
    {isAllOpen && <div role="dialog" aria-modal="true" aria-labelledby="all-notifications-title" onKeyDown={event => { if (event.key === 'Escape') setIsAllOpen(false); }} className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><h2 id="all-notifications-title" className="text-xl font-bold">All notifications</h2><p className="mt-1 text-sm text-slate-500">Current alerts across your properties, ordered by priority.</p></div><button autoFocus type="button" onClick={() => setIsAllOpen(false)} aria-label="Close notifications" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div>
        <label className="mt-4 block text-sm font-medium">Category<select value={category} onChange={event => setCategory(event.target.value)} className="ml-3 rounded-lg border border-slate-300 p-2">{categories.map(value => <option key={value}>{value}</option>)}</select></label>
        <div className="mt-3"><NoticeList items={filtered} /></div>
      </div>
    </div>}
  </>;
}
