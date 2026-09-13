import { money } from "../../lib/billing.js";
import { ArrowRight, CircleAlert, CreditCard, Wrench } from "lucide-react";
function AdminAttention({ onNavigate, snapshot }) {
  const items = [
    { title: snapshot.late.length + " late rent / utility bills", text: money(snapshot.overdue) + " outstanding as of " + snapshot.cutoff, icon: CreditCard, action: "Billing", tone: "bg-rose-50 text-rose-600" },
    { title: snapshot.openRequests.length + " requests need review", text: snapshot.openInquiries.length + " open guest inquiries", icon: Wrench, action: "Customer Requests", tone: "bg-amber-50 text-amber-700" },
  ];
  return <section className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><CircleAlert size={21}/></span><div><h2 className="font-bold">Needs attention</h2><p className="text-sm text-slate-500">Items that need an admin action today.</p></div></div><div className="mt-4 grid gap-3 md:grid-cols-2">{items.map(({title,text,icon:Icon,action,tone})=><button key={title} type="button" onClick={()=>onNavigate?.(action)} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/40"><span className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-lg "+tone}><Icon size={19}/></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">{title}</span><span className="block truncate text-xs text-slate-500">{text}</span></span><ArrowRight size={17} className="text-slate-400"/></button>)}</div></section>; }
export default AdminAttention;
