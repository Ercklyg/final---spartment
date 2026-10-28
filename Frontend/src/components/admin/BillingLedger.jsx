import { useState } from "react";
import { money, today } from "../../lib/billing.js";
import BillPaymentsDialog from "../billing/BillPaymentsDialog.jsx";
import PageControls from "../PageControls.jsx";

const colors = { Paid: "bg-emerald-50 text-emerald-700", Pending: "bg-amber-50 text-amber-700", "Partially paid": "bg-orange-50 text-orange-700", Late: "bg-rose-50 text-rose-700" };
const field = "w-full rounded-lg border border-slate-300 bg-white p-2 text-sm";
const button = "rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50";

function StatusBadge({ status }) {
  return <span className={"inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium " + colors[status]}><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current"/>{status}</span>;
}

export default function BillingLedger({ type, bills, summary, onPayment, onCorrection, onRefresh, createForm, month, onMonthChange, page, loading=false, filters, onFiltersChange }) {
  const query=filters.search,status=filters.status;
  const setQuery=search=>onFiltersChange({...filters,search,offset:0});
  const setStatus=status=>onFiltersChange({...filters,status,offset:0});
  const [selected,setSelected]=useState(null);
  const utility=type==="utility";
  const shown=bills.filter(bill=>bill.bill_type===type&&bill.billing_period.startsWith(month));
  const totals=summary.months[month]?.[type];
  const cards=utility?[["Electricity",totals?.electricity],["Water",totals?.water],["Collected",totals?.paid],["Balance",totals?.balance]]:[["Total billed",totals?.total],["Collected",totals?.paid],["Balance",totals?.balance],["Overdue balance",totals?.overdue]];
  const openDetails = (event, bill) => {
    event.preventDefault();
    event.stopPropagation();
    setSelected(bill);
  };

  return <>
    <div className="mt-5">{createForm}</div>
    <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">{cards.map(([label,value])=><article key={label} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"><p className="text-xs text-slate-600 sm:text-sm">{label}</p><h2 className="mt-1 break-words text-xl font-bold sm:mt-2 sm:text-2xl">{money(value)}</h2></article>)}</div>
    <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="p-4 sm:p-5">
        <div><h2 className="text-xl font-bold">{utility?"Utility bills":"Rent payment history"}</h2><p className="text-sm text-slate-600">Status updates from payments and due dates.</p></div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-[auto_minmax(180px,1fr)_auto_auto]">
          <label className="col-span-2 text-sm md:col-span-1">Month<input type="month" value={month} onChange={event=>onMonthChange(event.target.value || today().slice(0,7))} className={field}/></label>
          <label className="col-span-2 text-sm md:col-span-1"><span className="sr-only">Search tenant or room</span><input aria-label="Search tenant or room" placeholder="Search tenant or room" value={query} onChange={event=>setQuery(event.target.value)} className={field + " mt-[1.5rem]"}/></label>
          <label className="text-sm"><span className="sr-only">Bill status</span><select aria-label="Bill status" value={status} onChange={event=>setStatus(event.target.value)} className={field + " mt-[1.5rem]"}>{["All","Paid","Pending","Partially paid","Late"].map(value=><option key={value}>{value}</option>)}</select></label>
          <button type="button" onClick={onRefresh} className={button + " mt-[1.5rem]"}>Refresh</button>
        </div>
      </div>

      {loading&&<p role="status" aria-live="polite" className="border-t border-slate-100 px-4 py-3 text-sm text-blue-700 sm:px-5">Updating bills while keeping the current results visible…</p>}

      <div className="divide-y divide-slate-200 border-t border-slate-200 lg:hidden">
        {shown.map(bill=><article key={bill.id} className="p-4 sm:p-5">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0"><h3 className="break-words font-bold text-slate-900">{bill.leases?.profiles?.full_name || "Unknown tenant"}</h3><p className="text-sm text-slate-600">{bill.leases?.rooms?.buildings?.name || "Building"} / Room {bill.leases?.rooms?.room_number || "Unassigned"}</p></div>
            <StatusBadge status={bill.displayStatus}/>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-3 text-sm">
            <div><p className="text-xs text-slate-500">Billing period</p><p className="font-semibold">{bill.billing_period.slice(0,7)}</p><p className="text-xs text-slate-500">Due {bill.due_date}</p></div>
            <div><p className="text-xs text-slate-500">Total</p><p className="font-semibold">{money(bill.total)}</p></div>
            {utility&&<><div><p className="text-xs text-slate-500">Electricity</p><p className="font-semibold">{money(bill.electricity_amount)}</p></div><div><p className="text-xs text-slate-500">Water</p><p className="font-semibold">{money(bill.water_amount)}</p></div></>}
            <div><p className="text-xs text-slate-500">Paid</p><p className="font-semibold text-emerald-700">{money(bill.paid)}</p></div>
            <div><p className="text-xs text-slate-500">Balance</p><p className={"font-semibold "+(bill.balance>0?"text-rose-700":"text-emerald-700")}>{money(bill.balance)}</p></div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
            {bill.balance>0&&<button type="button" disabled={loading} onClick={()=>onPayment(bill)} className="rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Record payment</button>}
            <button type="button" disabled={loading} onClick={event=>openDetails(event,bill)} className={button}>{bill.payments.length?"Payments / receipts":"View details"}</button>
          </div>
        </article>)}
        {!loading&&!shown.length&&<p className="p-8 text-center text-sm text-slate-500">No bills match this month or search.</p>}
      </div>

      <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[1050px] text-left text-sm"><thead><tr>{["Tenant / Room","Period / Due date",...(utility?["Electricity","Water"]:[]),"Total","Paid","Balance","Status","Actions"].map(title=><th key={title}>{title}</th>)}</tr></thead>
        <tbody aria-busy={loading}>{shown.map(bill=><tr key={bill.id} className="border-t border-slate-200">
          <td><strong>{bill.leases?.profiles?.full_name || "Unknown tenant"}</strong><p className="text-slate-600">{bill.leases?.rooms?.buildings?.name} / Room {bill.leases?.rooms?.room_number || "Unassigned"}</p></td>
          <td><p>{bill.billing_period.slice(0,7)}</p><p className="whitespace-nowrap text-sm text-slate-600">Due {bill.due_date}</p></td>
          {utility&&<><td>{money(bill.electricity_amount)}</td><td>{money(bill.water_amount)}</td></>}
          <td>{money(bill.total)}</td><td>{money(bill.paid)}</td><td className={"font-semibold "+(bill.balance>0?"text-rose-700":"text-emerald-700")}>{money(bill.balance)}</td>
          <td><StatusBadge status={bill.displayStatus}/></td>
          <td><div className="flex flex-wrap gap-2">{bill.balance>0&&<button type="button" disabled={loading} onClick={()=>onPayment(bill)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">Record payment</button>}<button type="button" disabled={loading} onClick={event=>openDetails(event,bill)} className={button}>{bill.payments.length?"Payments / receipts":"View details"}</button></div></td>
        </tr>)}{!loading&&!shown.length&&<tr><td colSpan={utility?9:7} className="p-8 text-center text-slate-500">No bills match this month or search.</td></tr>}</tbody>
      </table></div>
      <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:px-5">Showing {shown.length} of {page.total} matching bills ({page.periodTotal} for {month}).</p>
      <PageControls disabled={loading} offset={filters.offset} limit={25} total={page.total} onChange={offset=>onFiltersChange({...filters,offset})}/>
    </section>
    {selected&&<BillPaymentsDialog key={selected.id} bill={selected} onClose={()=>setSelected(null)} onCorrection={onCorrection}/>}
  </>;
}
