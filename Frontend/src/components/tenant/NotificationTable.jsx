import { BellRing, ChevronRight, Info, ReceiptText } from "lucide-react";

const notifications = [
  { title: "Rent payment received", message: "Your May 2026 rent payment has been recorded.", date: "Today", icon: ReceiptText, color: "bg-emerald-50 text-emerald-600" },
  { title: "Utility bill is available", message: "Your May electricity and water statement is ready to view.", date: "May 8, 2026", icon: Info, color: "bg-blue-50 text-blue-600" },
];

function NotificationTable() {
  return (
    <section aria-labelledby="notifications-heading" className="mt-5 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <div className="flex items-center gap-2"><BellRing size={18} className="text-blue-600" /><h2 id="notifications-heading" className="text-sm font-bold text-slate-900">Notifications</h2><span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">2 new</span></div>
        <button type="button" className="text-xs font-medium text-blue-600 hover:underline">Mark all as read</button>
      </div>
      <div className="divide-y divide-slate-100">
        {notifications.map(({ title, message, date, icon: Icon, color }) => (
          <button key={title} type="button" className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-slate-50">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}><Icon size={17} /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">{title}</span><span className="block truncate text-xs text-slate-500">{message}</span></span>
            <span className="hidden whitespace-nowrap text-[11px] text-slate-400 sm:block">{date}</span><ChevronRight size={16} className="text-slate-300" />
          </button>
        ))}
      </div>
    </section>
  );
}

export default NotificationTable;
