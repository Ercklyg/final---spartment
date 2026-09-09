import { CalendarDays, CreditCard, House } from "lucide-react";

const cards = [
  { label: "My Room", value: "201", detail: "Floor 2  ·  Deluxe Room", icon: House, iconClass: "bg-blue-50 text-blue-600" },
  { label: "Monthly Rent", value: "₱6,500", detail: "Due every 15th", icon: CreditCard, iconClass: "bg-emerald-50 text-emerald-600" },
  { label: "Next Due", value: "May 15, 2026", detail: "In 7 days", icon: CalendarDays, iconClass: "bg-amber-50 text-amber-700" },
];

function SummaryCards() {
  return <section className="grid gap-3 md:grid-cols-3">{cards.map(({ label, value, detail, icon: Icon, iconClass }) => <article key={label} className="rounded-xl border border-slate-200/80 bg-white px-5 py-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]"><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconClass}`}><Icon size={18} /></span><p className="mt-2 text-[11px] font-medium text-slate-500">{label}</p><h2 className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900">{value}</h2><p className="mt-1 text-[11px] text-slate-500">{detail}</p></article>)}</section>;
}

export default SummaryCards;
