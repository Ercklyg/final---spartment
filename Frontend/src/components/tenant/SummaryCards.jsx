import { formatTenantRent } from "../../lib/tenantAccount.js";
import { CreditCard, House } from "lucide-react";

function SummaryCards({ account }) {
  const cards = [
    { label: "My Room", value: account.room?.room_number || "Not assigned", detail: account.room ? (account.room.buildings?.name || "Building") + " / Floor " + account.room.floor : "Contact your administrator", icon: House, iconClass: "bg-blue-50 text-blue-600" },
    { label: "Monthly Rent", value: formatTenantRent(account.rent), detail: "Your active tenancy", icon: CreditCard, iconClass: "bg-emerald-50 text-emerald-600" },
  ];
  return <section className="grid gap-2.5 md:grid-cols-2 md:gap-3">{cards.map(({ label, value, detail, icon: Icon, iconClass }) => <article key={label} className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3.5 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.035)] md:block md:px-5 md:py-3.5"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}><Icon size={18} /></span><div className="min-w-0 md:mt-2"><p className="text-[11px] font-medium text-slate-500">{label}</p><h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{value}</h2><p className="mt-0.5 text-[11px] text-slate-500 md:mt-1">{detail}</p></div></article>)}</section>;
}

export default SummaryCards;
