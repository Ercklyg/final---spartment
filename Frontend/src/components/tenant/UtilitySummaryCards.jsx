import { Droplets, WalletCards, Zap } from "lucide-react";
import { money } from "../../lib/billing.js";
export default function UtilitySummaryCards({ summary }) {
  const totals = summary.months[summary.utilityMonth]?.utility;
  const period = summary.utilityMonth ? new Date(summary.utilityMonth + "-01T00:00:00").toLocaleDateString("en-PH", {month:"long",year:"numeric"}) : "No bills yet";
  const utilities = [
    ["Electricity", totals?.electricity, Zap, "bg-amber-50 text-yellow-600"],
    ["Water", totals?.water, Droplets, "bg-blue-50 text-blue-600"],
    ["Combined utilities", totals?.total, WalletCards, "bg-emerald-50 text-emerald-600"]
  ];
  return <section className="grid gap-4 md:grid-cols-3">{utilities.map(([label,value,Icon,color]) => <article key={label} className="flex items-center gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <span className={"flex h-14 w-14 shrink-0 items-center justify-center rounded-xl " + color}><Icon size={26} /></span>
    <div className="min-w-0"><p className="text-sm text-slate-500">{label}</p><h2 className="mt-0.5 break-words text-[30px] font-extrabold leading-none tracking-tight">{money(value)}</h2><p className="mt-2 text-[11px] text-slate-500">{period}</p></div>
  </article>)}</section>;
}
