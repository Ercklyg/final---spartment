import { Hand, RefreshCw } from "lucide-react";
import ReportMonthPicker from "../ReportMonthPicker.jsx";

function AdminHero({ selectedMonth, availableMonths = [], onMonthChange, compact = false, updatedAt, loading, onRefresh }) {
  if (compact) return <section className="dashboard-heading flex items-center justify-between gap-4">
    <div className="min-w-0"><h1 className="text-2xl font-bold tracking-tight text-slate-950">Dashboard</h1><p className="mt-1 text-xs text-slate-500">{updatedAt ? `Updated ${new Date(updatedAt).toLocaleString('en-PH')}` : 'Your property at a glance'}</p></div>
    <div className="flex shrink-0 items-center gap-3"><ReportMonthPicker value={selectedMonth} months={availableMonths} onChange={onMonthChange}/><button type="button" onClick={onRefresh} disabled={loading} aria-label="Refresh dashboard" title="Refresh dashboard" className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={17} className={loading ? 'animate-spin motion-reduce:animate-none' : ''}/></button></div>
  </section>;
  return <section className="flex flex-col justify-between gap-4 py-6 md:flex-row md:items-center md:py-8">
    <div><p className="text-xs font-semibold tracking-wide text-slate-500 sm:text-sm">DASHBOARD</p><h1 className="mt-1 flex items-center gap-2 text-[28px] font-extrabold leading-tight tracking-[-0.045em] sm:text-[38px]">Good morning, Admin <Hand size={28} className="shrink-0 text-amber-500" aria-hidden="true" /></h1><p className="mt-1 text-sm leading-5 text-slate-500 sm:text-lg">Here&apos;s what needs your attention across the property today.</p></div>
    <ReportMonthPicker value={selectedMonth} months={availableMonths} onChange={onMonthChange}/>
  </section>;
}
export default AdminHero;
