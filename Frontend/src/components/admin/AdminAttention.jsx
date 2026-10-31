import { ArrowRight, Building2, CheckCircle2, CircleAlert, TriangleAlert, Wrench } from "lucide-react";
import { money } from "../../lib/billing.js";

const tones = {
  rose: { icon: "bg-rose-50 text-rose-600", hover: "hover:border-rose-200 hover:bg-rose-50/30", action: "text-rose-700" },
  amber: { icon: "bg-amber-50 text-amber-700", hover: "hover:border-amber-200 hover:bg-amber-50/30", action: "text-amber-700" },
  emerald: { icon: "bg-emerald-50 text-emerald-600", hover: "hover:border-emerald-200 hover:bg-emerald-50/30", action: "text-emerald-700" },
  blue: { icon: "bg-blue-50 text-blue-600", hover: "hover:border-blue-200 hover:bg-blue-50/30", action: "text-blue-700" },
};

function AdminAttention({ onNavigate, snapshot }) {
  const collectionHealth = snapshot.collectionHealth || {};
  const lateTenants = snapshot.late || [];
  const riskCount = collectionHealth.repeatLatePayers?.length || 0;
  const billCount = lateTenants.length;
  const itemCount = snapshot.openRequests?.length || 0;
  const inquiryCount = snapshot.openInquiries?.length || 0;
  const items = [
    {
      title: billCount ? `${billCount} late rent / utility ${billCount === 1 ? "bill" : "bills"}` : "No late bills",
      text: billCount ? `${money(snapshot.overdue)} overdue${riskCount ? ` · ${riskCount} at-risk ${riskCount === 1 ? "tenant" : "tenants"}` : ""}` : "Every saved bill is within its due date.",
      Icon: billCount ? TriangleAlert : CheckCircle2,
      tone: billCount ? "rose" : "emerald",
      page: "Billing",
      action: "Review billing",
    },
    {
      title: itemCount ? `${itemCount} ${itemCount === 1 ? "request needs" : "requests need"} review` : "No requests waiting",
      text: `${inquiryCount} open guest ${inquiryCount === 1 ? "inquiry" : "inquiries"}`,
      Icon: Wrench,
      tone: itemCount ? "amber" : "emerald",
      page: "Customer Requests",
      action: "Review requests",
    },
    {
      title: snapshot.available ? `${snapshot.available} ${snapshot.available === 1 ? "room is" : "rooms are"} available` : "All rooms assigned",
      text: snapshot.available ? "Review room readiness and pending tenant assignments." : "There are no available rooms requiring review.",
      Icon: snapshot.available ? Building2 : CheckCircle2,
      tone: snapshot.available ? "blue" : "emerald",
      page: "Rooms",
      action: "Review rooms",
    },
  ];

  return <section className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="attention-heading">
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><CircleAlert size={21} /></span>
      <div className="min-w-0">
        <h2 id="attention-heading" className="font-bold">What needs attention</h2>
        <p className="text-xs leading-5 text-slate-500 sm:text-sm">Items that need an admin action today.</p>
      </div>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {items.map(({ title, text, Icon, tone, page, action }) => {
        const style = tones[tone];
        return <button key={title} type="button" onClick={() => onNavigate?.(page)} className={"flex h-full min-w-0 items-start gap-3 rounded-xl border border-slate-200 p-3 text-left transition " + style.hover}>
          <span className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-lg " + style.icon}><Icon size={19} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold leading-5 text-slate-800">{title}</span>
            <span className="mt-0.5 block text-xs leading-4 text-slate-500">{text}</span>
            <span className={"mt-2 inline-flex items-center gap-1 text-[11px] font-bold " + style.action}>{action}<ArrowRight size={12} /></span>
          </span>
        </button>;
      })}
    </div>
  </section>;
}
export default AdminAttention;
