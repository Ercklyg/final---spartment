import { Plus, RefreshCw } from "lucide-react";

export default function TenantsToolbar({ onAdd, onRefresh, count, loading }) {
  return <section className="flex flex-wrap items-end justify-between gap-4 py-6 sm:py-10">
    <div><p className="text-[10px] font-bold tracking-[0.24em] text-slate-500 sm:text-xs sm:tracking-[0.28em]">TENANTS</p><h1 className="mt-1 text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">Tenants</h1><p className="mt-1 text-base text-slate-500 sm:text-lg">{count == null ? "Tenant directory" : count + " active tenants"}</p></div>
    <div className="grid w-full grid-cols-[auto_1fr] gap-2 sm:flex sm:w-auto sm:flex-wrap sm:gap-3">
      <button type="button" disabled={loading} onClick={onRefresh} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={18} />Refresh</button>
      <button type="button" onClick={onAdd} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 sm:gap-3 sm:px-5 sm:text-base"><Plus size={19} />Add Tenant</button>
    </div>
  </section>;
}
