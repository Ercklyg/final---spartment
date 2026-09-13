import { useState } from "react";
import { Droplets, FileText, House } from "lucide-react";
import { money } from "../../lib/billing.js";
import { formatTenantDate } from "../../lib/tenantAccount.js";
import BillPaymentsDialog from "../billing/BillPaymentsDialog.jsx";

function Status({ value }) {
  return <span className={"whitespace-nowrap rounded-full px-2.5 py-1 text-xs " + (value === "Paid" ? "bg-emerald-50 text-emerald-600" : value === "Late" ? "bg-rose-50 text-rose-500" : "bg-amber-50 text-amber-700")}>{value}</span>;
}
const periodLabel = value => new Date(value + "T00:00:00").toLocaleDateString("en-PH", {month:"long",year:"numeric"});

export default function StatementSection({ type, statusFilter = "All", bills }) {
  const [year,setYear]=useState("All");
  const [selected,setSelected]=useState(null);
  const isRent=type==="rent", Icon=isRent?House:Droplets;
  const rows=bills.filter(bill=>bill.bill_type===type);
  const years=[...new Set(rows.map(bill=>bill.billing_period.slice(0,4)))].sort().reverse();
  const shown=rows.filter(bill=>(statusFilter==="All"||bill.displayStatus===statusFilter)&&(year==="All"||bill.billing_period.startsWith(year)));
  const heads=["Period","Due date",...(isRent?["Amount"]:["Electricity","Water","Total"]),"Balance","Status","Actions"];
  const action = bill => <button type="button" onClick={()=>setSelected(bill)} className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"><FileText size={18}/>{bill.payments.length ? "View receipts" : "View details"}</button>;
  return <>
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3 sm:mb-4">
        <div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:h-11 sm:w-11"><Icon size={21}/></span><div><h2 className="text-base font-bold tracking-tight sm:text-lg">{isRent?"Rent statements":"Utility statements"}</h2><p className="text-xs text-slate-500 sm:text-sm">{isRent?"Your monthly rent payment history.":"Your monthly electricity and water bills."}</p></div></div>
        <select aria-label={type+" statement year"} value={year} onChange={event=>setYear(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"><option value="All">All years</option>{years.map(value=><option key={value}>{value}</option>)}</select>
      </div>
      {!shown.length?<p className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">No {type} statements match your filters.</p>:<>
        <div className="space-y-2 sm:hidden">{shown.map(bill=><article key={bill.id} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
          <div className="flex items-center justify-between gap-2"><div><p className="text-sm font-bold">{periodLabel(bill.billing_period)}</p><p className="text-xs text-slate-500">Due {formatTenantDate(bill.due_date)}</p></div><div className="text-right"><p className="font-bold">{money(bill.total)}</p><div className="mt-1"><Status value={bill.displayStatus}/></div></div></div>
          {!isRent&&<p className="mt-2 text-xs text-slate-500">Electricity {money(bill.electricity_amount)} · Water {money(bill.water_amount)}</p>}
          <p className="mt-2 text-xs text-slate-500">Balance {money(bill.balance)}</p><div className="mt-2">{action(bill)}</div>
        </article>)}</div>
        <div className="hidden overflow-x-auto sm:block"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500"><tr>{heads.map(head=><th key={head} className="px-4 py-3">{head}</th>)}</tr></thead>
          <tbody>{shown.map(bill=><tr key={bill.id} className="border-b border-slate-200 last:border-0">
            <td className="px-4 py-3 text-sm font-semibold">{periodLabel(bill.billing_period)}</td><td className="px-4 py-3 text-sm text-slate-600">{formatTenantDate(bill.due_date)}</td>
            {!isRent&&<><td className="px-4 py-3 text-sm text-slate-600">{money(bill.electricity_amount)}</td><td className="px-4 py-3 text-sm text-slate-600">{money(bill.water_amount)}</td></>}
            <td className="px-4 py-3 text-sm font-semibold">{money(bill.total)}</td><td className="px-4 py-3 text-sm text-slate-600">{money(bill.balance)}</td><td className="px-4 py-3"><Status value={bill.displayStatus}/></td><td className="px-4 py-3">{action(bill)}</td>
          </tr>)}</tbody>
        </table></div>
      </>}
    </section>
    {selected&&<BillPaymentsDialog key={selected.id} bill={selected} onClose={()=>setSelected(null)}/>}
  </>;
}
