import { useRef } from "react";
import { CalendarDays, ChevronDown, Hand } from "lucide-react";

function AdminHero({ selectedMonth, onMonthChange }) {
  const monthInput = useRef(null);
  const monthLabel = new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric" }).format(new Date(selectedMonth + "-01T12:00:00"));
  const openMonthPicker = () => {
    if (typeof monthInput.current?.showPicker === "function") monthInput.current.showPicker();
    else monthInput.current?.focus();
  };
  return <section className="flex flex-col justify-between gap-4 py-6 md:flex-row md:items-center md:py-8">
    <div><p className="text-xs font-semibold tracking-wide text-slate-500 sm:text-sm">DASHBOARD</p><h1 className="mt-1 flex items-center gap-2 text-[28px] font-extrabold leading-tight tracking-[-0.045em] sm:text-[38px]">Good morning, Admin <Hand size={28} className="shrink-0 text-amber-500" aria-hidden="true" /></h1><p className="mt-1 text-sm leading-5 text-slate-500 sm:text-lg">Here&apos;s what needs your attention across the property today.</p></div>
    <div className="relative w-full sm:w-auto"><button type="button" onClick={openMonthPicker} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/30 sm:w-fit"><CalendarDays size={19} className="text-blue-600"/><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{monthLabel}</span><span className="block text-[11px] text-slate-500">Reporting month</span></span><ChevronDown size={17}/></button><input ref={monthInput} type="month" value={selectedMonth} onChange={event => { if (event.target.value) onMonthChange(event.target.value); }} aria-label="Dashboard month filter" className="pointer-events-none absolute h-px w-px opacity-0"/></div>
  </section>;
}
export default AdminHero;
