import { ArrowRight, Building2, CheckCircle2, CircleAlert, Clock3, TrendingDown, TrendingUp, TriangleAlert, Wrench } from "lucide-react";
import { money } from "../../lib/billing.js";

const periodLabel = value => /^\d{4}-\d{2}$/.test(value)
  ? new Date(value + "-01T12:00:00").toLocaleDateString("en-PH", { month: "short" }) : value;
const tones = {
  rose: { icon: "bg-rose-50 text-rose-600", hover: "hover:border-rose-200 hover:bg-rose-50/30", action: "text-rose-700" },
  amber: { icon: "bg-amber-50 text-amber-700", hover: "hover:border-amber-200 hover:bg-amber-50/30", action: "text-amber-700" },
  emerald: { icon: "bg-emerald-50 text-emerald-600", hover: "hover:border-emerald-200 hover:bg-emerald-50/30", action: "text-emerald-700" },
  blue: { icon: "bg-blue-50 text-blue-600", hover: "hover:border-blue-200 hover:bg-blue-50/30", action: "text-blue-700" },
};

function AdminAttention({ onNavigate, snapshot, series = [] }) {
  const collectionHealth = snapshot.collectionHealth || {};
  const aging = collectionHealth.aging || [];
  const lateTenants = snapshot.late || [];
  const riskCount = collectionHealth.repeatLatePayers?.length || 0;
  const largest = aging.reduce((top, bucket) => Number(bucket.balance) > Number(top.balance) ? bucket : top, { balance: 0, billCount: 0, label: "" });
  const latest = series[series.length - 1];
  const previous = series[series.length - 2];
  const change = latest && previous && Number(previous.value) ? ((Number(latest.value) - Number(previous.value)) / Number(previous.value)) * 100 : null;
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
      title: Number(largest.balance) > 0 ? `${largest.label} is the largest aging balance` : "No aging balances",
      text: Number(largest.balance) > 0 ? `${money(largest.balance)} across ${largest.billCount} ${largest.billCount === 1 ? "bill" : "bills"}.` : "No overdue bills in the current snapshot.",
      Icon: Number(largest.balance) > 0 ? Clock3 : CheckCircle2,
      tone: Number(largest.balance) > 0 ? "amber" : "emerald",
      page: "Billing",
      action: "View bills",
    },
  ];

  if (change !== null) {
    items.push({
      title: `Collections ${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(1)}%`,
      text: `${money(latest.value)} collected vs ${money(previous.value)} in ${periodLabel(previous.label)}.`,
      Icon: change >= 0 ? TrendingUp : TrendingDown,
      tone: change >= 0 ? "emerald" : "rose",
      page: "Billing",
      action: "Review payments",
    });
  } else {
    items.push({
      title: "Vacancy opportunity",
      text: `${snapshot.available} available ${snapshot.available === 1 ? "room" : "rooms"} represent ${money(snapshot.vacancyGap)} in potential monthly rent.`,
      Icon: Building2,
      tone: "blue",
      page: "Rooms",
      action: "Review rooms",
    });
  }

  return <section className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="attention-heading">
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><CircleAlert size={21} /></span>
      <div className="min-w-0">
        <h2 id="attention-heading" className="font-bold">What needs attention</h2>
        <p className="text-xs leading-5 text-slate-500 sm:text-sm">Items that need an admin action today.</p>
      </div>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
