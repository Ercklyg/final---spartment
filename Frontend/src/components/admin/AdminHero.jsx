import { Hand } from "lucide-react";
import CalendarInput from "../CalendarInput.jsx";

function AdminHero({ selectedMonth, onMonthChange }) {
  return <section className="flex flex-col justify-between gap-4 py-6 md:flex-row md:items-center md:py-8">
    <div><p className="text-xs font-semibold tracking-wide text-slate-500 sm:text-sm">DASHBOARD</p><h1 className="mt-1 flex items-center gap-2 text-[28px] font-extrabold leading-tight tracking-[-0.045em] sm:text-[38px]">Good morning, Admin <Hand size={28} className="shrink-0 text-amber-500" aria-hidden="true" /></h1><p className="mt-1 text-sm leading-5 text-slate-500 sm:text-lg">Here&apos;s what needs your attention across the property today.</p></div>
    <div className="w-full shrink-0 md:w-56"><CalendarInput type="month" label="Dashboard month filter" value={selectedMonth} onChange={event => { if (event.target.value) onMonthChange(event.target.value); }}/></div>
  </section>;
}
export default AdminHero;
