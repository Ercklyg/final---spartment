import { money } from "../../lib/billing.js";
import { Building2, CreditCard, UsersRound } from "lucide-react";
const colors={emerald:"bg-emerald-50 text-emerald-600",blue:"bg-blue-50 text-blue-600",violet:"bg-violet-50 text-violet-600"};
function AdminMetrics({onNavigate, snapshot}){
const data=[
  ["Monthly Revenue",money(snapshot.collected),"Collected",CreditCard,"emerald","Billing"],
  ["Occupancy Rate",snapshot.occupancy.toFixed(1)+"%","Current rooms",Building2,"blue","Rooms"],
  ["Active Tenants",snapshot.activeTenants,"Active leases",UsersRound,"violet","Tenants"]
];return <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">{data.map(([label,value,change,Icon,color,page])=><button type="button" onClick={()=>onNavigate?.(page)} key={label} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"><span className={"flex h-12 w-12 items-center justify-center rounded-xl "+colors[color]}><Icon size={23}/></span><p className="mt-3 text-sm text-slate-500">{label}</p><h2 className="text-[28px] font-extrabold tracking-tight">{value}</h2><span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">{change}</span><p className="mt-1 text-xs text-slate-500">View details</p></button>)}</section>;}
export default AdminMetrics;
