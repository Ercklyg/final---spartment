import { money } from "../../lib/billing.js";
import { Building2, CreditCard, UsersRound } from "lucide-react";
const colors={emerald:"bg-emerald-50 text-emerald-600",blue:"bg-blue-50 text-blue-600",violet:"bg-violet-50 text-violet-600"};
function AdminMetrics({onNavigate, snapshot}){
const data=[
  ["Monthly Revenue",money(snapshot.collected),"Collected",CreditCard,"emerald","Billing"],
  ["Occupancy Rate",snapshot.occupancy.toFixed(1)+"%","Current rooms",Building2,"blue","Rooms"],
  ["Active Tenants",snapshot.activeTenants,"Active leases",UsersRound,"violet","Tenants"]
];return <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">{data.map(([label,value,change,Icon,color,page],index)=><button type="button" onClick={()=>onNavigate?.(page)} key={label} className={(index===0?"col-span-2 sm:col-span-1 ":"")+"relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md sm:p-5"}><span className={"flex h-10 w-10 items-center justify-center rounded-xl sm:h-12 sm:w-12 "+colors[color]}><Icon size={21}/></span><p className="mt-3 text-xs text-slate-500 sm:text-sm">{label}</p><h2 className="break-words text-[22px] font-extrabold leading-tight tracking-tight sm:text-[28px]">{value}</h2><span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 sm:text-xs">{change}</span><p className="mt-1 text-[10px] text-slate-500 sm:text-xs">View details</p></button>)}</section>;}
export default AdminMetrics;
