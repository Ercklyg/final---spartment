import { money } from "../../lib/billing.js";
import { useState } from "react";
import { BellRing, MessageSquare, TriangleAlert, Wrench, X } from "lucide-react";


const colors = { emerald: "bg-emerald-50 text-emerald-600", rose: "bg-rose-50 text-rose-500", amber: "bg-amber-50 text-amber-500", blue: "bg-blue-50 text-blue-600" };

function NoticeList({ items }) {
  return items.map(({id, title, text, time, Icon, color}) => <div key={id} className="flex items-center gap-4 border-b border-slate-200 py-3 last:border-0">
    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colors[color]}`}><Icon size={23} /></span>
    <div className="min-w-0 flex-1"><h3 className="font-semibold">{title}</h3><p className="text-sm text-slate-500">{text}</p></div>
    <span className="whitespace-nowrap text-sm text-slate-500">{time}</span>
  </div>);
}

function AdminNotifications({ snapshot }) {
  const notices = [
    ...snapshot.late.map(bill => ({id: bill.id, title: "Late payment alert", text: bill.name + " · " + bill.room + " · " + money(bill.balance) + " past due", time: "Due " + bill.due_date, Icon: TriangleAlert, color: "rose"})),
    ...snapshot.openRequests.map(request => ({id: request.id, title: request.kind === "maintenance" ? "Maintenance request" : "Tenant request", text: request.subject, time: request.status, Icon: Wrench, color: "amber"})),
    ...snapshot.openInquiries.map(inquiry => ({id: inquiry.id, title: "Guest inquiry", text: "A guest inquiry is awaiting review.", time: new Date(inquiry.created_at).toLocaleDateString("en-PH"), Icon: MessageSquare, color: "blue"})),
  ];
  const [isAllOpen, setIsAllOpen] = useState(false);

  return <><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-4"><BellRing className="text-blue-600" size={29} /><div className="flex-1"><h2 className="text-xl font-bold">Notifications</h2><p className="text-sm text-slate-500">Pending updates across your properties.</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600">{notices.length} pending</span><button type="button" disabled={!notices.length} onClick={() => setIsAllOpen(true)} className="text-sm font-medium text-blue-600 hover:underline">View all →</button></div><div className="mt-4">{notices.length ? <NoticeList items={notices.slice(0, 3)} /> : <p className="py-5 text-sm text-slate-500">No pending notifications.</p>}</div></section>{isAllOpen && <div role="dialog" aria-modal="true" aria-labelledby="all-notifications-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4"><div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 id="all-notifications-title" className="text-xl font-bold">All notifications</h2><p className="mt-1 text-sm text-slate-500">Latest updates across your properties.</p></div><button type="button" onClick={() => setIsAllOpen(false)} aria-label="Close notifications" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div><div className="mt-5"><NoticeList items={notices} /></div></div></div>}</>;
}

export default AdminNotifications;
