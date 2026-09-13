import PageSkeleton from '../PageSkeleton.jsx';
import { useState } from "react";
import { money, today } from "../../lib/billing.js";
import BillPaymentsDialog from "../billing/BillPaymentsDialog.jsx";
import PageControls from '../PageControls.jsx';

const colors = { Paid: "bg-emerald-50 text-emerald-700", Pending: "bg-amber-50 text-amber-700", "Partially paid": "bg-orange-50 text-orange-700", Late: "bg-rose-50 text-rose-700" };
const field = "rounded-lg border border-slate-300 bg-white p-2 text-sm";
const button = "rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50";

export default function BillingLedger({ type, bills, summary, onPayment, onCorrection, onRefresh, createForm, month, onMonthChange, page, loading=false, filters, onFiltersChange }) {
  const query=filters.search,status=filters.status;
  const setQuery=search=>onFiltersChange({...filters,search,offset:0});
  const setStatus=status=>onFiltersChange({...filters,status,offset:0});
  const [selected,setSelected]=useState(null);
  const utility=type==="utility";
  const period=bills.filter(bill=>bill.bill_type===type&&bill.billing_period.startsWith(month));
  const shown=period;
  const totals=summary.months[month]?.[type];
  const cards=utility?[["Electricity",totals?.electricity],["Water",totals?.water],["Collected",totals?.paid],["Balance",totals?.balance]]:[["Total billed",totals?.total],["Collected",totals?.paid],["Balance",totals?.balance],["Overdue balance",totals?.overdue]];
  return <>
    <div className="mt-5">{createForm}</div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value])=><article key={label} className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-600">{label}</p><h2 className="mt-2 text-2xl font-bold">{money(value)}</h2></article>)}</div>
    <section className="mt-5 rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-end gap-3 p-5"><div className="mr-auto"><h2 className="text-xl font-bold">{utility?"Utility bills":"Rent payment history"}</h2><p className="text-sm text-slate-600">Status updates from payments and due dates.</p></div>
        <label className="text-sm">Month <input type="month" value={month} onChange={event=>onMonthChange(event.target.value || today().slice(0,7))} className={field}/></label>
        <input aria-label="Search tenant or room" placeholder="Search tenant or room" value={query} onChange={event=>setQuery(event.target.value)} className={field}/>
        <select aria-label="Bill status" value={status} onChange={event=>setStatus(event.target.value)} className={field}>{["All","Paid","Pending","Partially paid","Late"].map(value=><option key={value}>{value}</option>)}</select>
        <button onClick={onRefresh} className={button}>Refresh</button>
      </div>
      
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead><tr>{["Tenant / Room","Period / Due date",...(utility?["Electricity","Water"]:[]),"Total","Paid","Balance","Status","Actions"].map(title=><th key={title}>{title}</th>)}</tr></thead>
        <tbody aria-busy={loading}>{loading&&<tr><td colSpan={utility?10:8}><PageSkeleton variant="list" label="Updating bills..."/></td></tr>}{!loading&&shown.map(bill=><tr key={bill.id} className="border-t border-slate-200">
          <td><strong>{bill.leases?.profiles?.full_name || "Unknown tenant"}</strong><p className="text-slate-600">{bill.leases?.rooms?.buildings?.name} / Room {bill.leases?.rooms?.room_number || "Unassigned"}</p></td>
          <td><p>{bill.billing_period.slice(0,7)}</p><p className="whitespace-nowrap text-sm text-slate-600">Due {bill.due_date}</p></td>
          {utility&&<><td>{money(bill.electricity_amount)}</td><td>{money(bill.water_amount)}</td></>}
          <td>{money(bill.total)}</td><td>{money(bill.paid)}</td><td className={"font-semibold "+(bill.balance>0?"text-rose-700":"text-emerald-700")}>{money(bill.balance)}</td>
          <td><span className={"inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium "+colors[bill.displayStatus]}><span aria-hidden="true" className="h-2 w-2 rounded-full bg-current"/>{bill.displayStatus}</span></td>
          <td><div className="flex flex-wrap gap-2">{bill.balance>0&&<button disabled={loading} onClick={()=>onPayment(bill)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">Record payment</button>}<button disabled={loading} onClick={()=>setSelected(bill)} className={button}>{bill.payments.length?"Payments / receipts":"View details"}</button></div></td>
        </tr>)}{!loading&&!shown.length&&<tr><td colSpan={utility?10:8} className="p-8 text-center text-slate-500">No bills match this month or search.</td></tr>}</tbody>
      </table></div>
      <p className="border-t border-slate-100 px-5 py-3 text-sm text-slate-500">Showing {shown.length} of {page.total} matching bills ({page.periodTotal} for {month}).</p>
      <PageControls disabled={loading} offset={filters.offset} limit={25} total={page.total} onChange={offset=>onFiltersChange({...filters,offset})}/>
    </section>
    {selected&&<BillPaymentsDialog key={selected.id} bill={selected} onClose={()=>setSelected(null)} onCorrection={onCorrection}/>}
  </>;
}
