import { Plus } from "lucide-react";
function TenantsToolbar() { return <section className="flex items-end justify-between py-10"><div><p className="text-xs font-bold tracking-[0.28em] text-slate-500">TENANTS</p><h1 className="mt-1 text-4xl font-extrabold tracking-[-0.045em]">Tenants</h1><p className="mt-1 text-lg text-slate-500">10 active tenants</p></div><button type="button" className="flex items-center gap-3 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-700"><Plus size={21} />Add Tenant</button></section>; }
export default TenantsToolbar;
