import { Plus, RefreshCw } from "lucide-react";

export default function TenantsToolbar({ onAdd, onRefresh, count, loading }) {
  return <section className="flex flex-wrap items-end justify-between gap-4 py-10">
    <div><p className="text-xs font-bold tracking-[0.28em] text-slate-500">TENANTS</p><h1 className="mt-1 text-4xl font-extrabold tracking-[-0.045em]">Tenants</h1><p className="mt-1 text-lg text-slate-500">{count == null ? "Tenant directory" : count + " active tenants"}</p></div>
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={loading} onClick={onRefresh} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={18} />Refresh</button>
      <button type="button" onClick={onAdd} className="flex items-center gap-3 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-700"><Plus size={21} />Add Tenant</button>
    </div>
  </section>;
}
