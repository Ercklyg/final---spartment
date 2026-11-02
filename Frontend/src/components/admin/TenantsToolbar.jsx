import { Plus, RefreshCw, Search, X } from "lucide-react";

export default function TenantsToolbar({ onAdd, onRefresh, count, loading, search, onSearch }) {
  return <><section className="flex flex-wrap items-end justify-between gap-4 pb-5 pt-6 sm:pb-6 sm:pt-10">
    <div><p className="text-[10px] font-bold tracking-[0.24em] text-slate-600 sm:text-xs sm:tracking-[0.28em]">TENANTS</p><h1 className="mt-1 text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">Tenants</h1><p className="mt-1 text-base text-slate-600 sm:text-lg">{count == null ? "Tenant directory" : count + " active tenants"}</p></div>
    <div className="grid w-full grid-cols-[auto_1fr] gap-2 sm:flex sm:w-auto sm:flex-wrap sm:gap-3">
      <button type="button" disabled={loading} onClick={onRefresh} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={18} />Refresh</button>
      <button type="button" onClick={onAdd} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 sm:gap-3 sm:px-5 sm:text-base"><Plus size={19} />Add Tenant</button>
    </div>
  </section><section aria-label="Search tenants" className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"><label className="relative block"><Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"/><span className="sr-only">Search tenants</span><input value={search} onChange={event => onSearch(event.target.value)} placeholder="Search by name, email, phone, or room..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-11 text-sm text-slate-800 outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"/>{search && <button type="button" onClick={() => onSearch("")} aria-label="Clear tenant search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"><X size={16}/></button>}</label></section></>;
}
