import { lazy, Suspense, useMemo, useState } from "react";
import { money, today } from "../../lib/billing.js";
import { formatTenantDate } from "../../lib/tenantAccount.js";
import PageControls from "../PageControls.jsx";
import { BellRing, RefreshCw, Search, X } from "lucide-react";
import BillActions from "./BillActions.jsx";

const BillPaymentsDialog = lazy(() => import("../billing/BillPaymentsDialog.jsx"));
const ReminderDialog = lazy(() => import("./ReminderDialog.jsx"));
const BulkReminderDialog = lazy(() => import("./BulkReminderDialog.jsx"));
const colors = { Paid: "bg-emerald-50 text-emerald-700", Pending: "bg-slate-100 text-slate-600", "Partially paid": "bg-amber-50 text-amber-800", Late: "bg-rose-50 text-rose-700" };
const field = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50";
const cardTones = {
  Electricity: "border-t-blue-500 bg-blue-50/35", Water: "border-t-cyan-500 bg-cyan-50/35",
  "Total billed": "border-t-blue-500 bg-blue-50/35", Collected: "border-t-emerald-500 bg-emerald-50/35",
  Balance: "border-t-amber-500 bg-amber-50/35", "Overdue balance": "border-t-rose-500 bg-rose-50/35",
};
const statuses = ["All", "Paid", "Pending", "Partially paid", "Late"];
const monthLabel = value => new Date(value.slice(0,7) + "-01T00:00:00").toLocaleDateString("en-PH", {month:"short",year:"numeric"});
function StatusBadge({ status }) {
  return <span className={"billing-history-status inline-flex whitespace-nowrap rounded-full px-2.5 py-1 font-medium " + (colors[status] || colors.Pending)}>{status}</span>;
}
const DialogLoading = ({ label }) => <div role="status" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4"><p className="rounded-xl bg-white px-5 py-4 text-sm font-medium text-slate-700">{label}</p></div>;

export default function BillingLedger({ type, bills, summary, onPayment, onReminder, onCorrection, onRefresh, createForm, month, onMonthChange, page, loading=false, filters, onFiltersChange }) {
  const query=filters.search,status=filters.status;
  const setQuery=search=>onFiltersChange({...filters,search,offset:0});
  const setStatus=status=>onFiltersChange({...filters,status,offset:0});
  const clearFilters=()=>onFiltersChange({...filters,search:"",status:"All",offset:0});
  const [selected,setSelected]=useState(null);
  const [reminder,setReminder]=useState(null);
  const [bulkReminder,setBulkReminder]=useState(false);
  const utility=type==="utility";
  const shown=useMemo(()=>bills.filter(bill=>bill.bill_type===type&&bill.billing_period.startsWith(month)),[bills,type,month]);
  const totals=summary.months[month]?.[type];
  const cards=useMemo(()=>utility?[["Electricity",totals?.electricity],["Water",totals?.water],["Collected",totals?.paid],["Balance",totals?.balance]]:[["Total billed",totals?.total],["Collected",totals?.paid],["Balance",totals?.balance],["Overdue balance",totals?.overdue]],[utility,totals]);
  return <>
    <div className="relative z-10 mt-5">{createForm}</div>
    <div className="billing-deferred-panel mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">{cards.map(([label,value])=><article key={label} className={"min-w-0 rounded-xl border border-t-4 border-slate-200 p-4 shadow-sm sm:p-5 " + cardTones[label]}><p className="text-xs font-medium text-slate-600 sm:text-sm">{label}</p><h2 className="mt-1 break-words text-xl font-bold text-slate-950 sm:mt-2 sm:text-2xl">{money(value)}</h2></article>)}</div>
    <section aria-label="Billing history" className="billing-history mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-xl font-bold">{utility?"Utility bills":"Rent payment history"}</h2><p className="mt-1 text-sm text-slate-500">Billed amounts, collections, and remaining balances.</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>setBulkReminder(true)} disabled={loading} className={button}><BellRing size={16} aria-hidden="true"/>Send reminders</button><button type="button" onClick={onRefresh} disabled={loading} className={button}><RefreshCw size={16} aria-hidden="true" className={loading?"animate-spin motion-reduce:animate-none":""}/>Refresh</button></div>
        </div>
        <div className="mt-5 grid items-end gap-3 sm:grid-cols-[170px_minmax(0,1fr)] lg:grid-cols-[170px_minmax(0,1fr)_170px]">
          <label className="text-xs font-medium text-slate-500">Month<input aria-label="History month" type="month" value={month} onChange={event=>onMonthChange(event.target.value || today().slice(0,7))} className={field}/></label>
          <label className="min-w-0 text-xs font-medium text-slate-500">Search<span className="relative mt-1.5 block"><Search aria-hidden="true" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input aria-label="Search tenant or room" placeholder="Search tenant or room" value={query} onChange={event=>setQuery(event.target.value)} className={field + " !mt-0 pl-10 pr-12"}/>{query&&<button type="button" aria-label="Clear search" onClick={()=>setQuery("")} className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700"><X size={16} aria-hidden="true"/></button>}</span></label>
          <label className="text-xs font-medium text-slate-500 sm:col-span-2 lg:col-span-1">Status<select aria-label="Bill status" value={status} onChange={event=>setStatus(event.target.value)} className={field}>{statuses.map(value=><option key={value} value={value}>{value === "All" ? "All statuses" : value}</option>)}</select></label>
        </div>
        {(query || status !== "All") && <button type="button" onClick={clearFilters} className="mt-2 rounded-lg px-2 text-sm font-medium text-blue-600 hover:bg-blue-50">Clear filters</button>}
      </div>
      {loading&&<div role="status" aria-live="polite" className="border-t border-blue-100 bg-blue-50/50"><div className="h-1 w-full animate-pulse bg-blue-500 motion-reduce:animate-none"/><p className="px-5 py-2 text-xs font-medium text-blue-700">Updating billing records...</p></div>}
      <p className="px-5 pb-3 text-xs text-slate-500 lg:hidden">Swipe the table to see amounts and actions.</p>
      <div role="region" aria-label="Billing history table, scroll horizontally for more columns" tabIndex={0} className="billing-history-scroll overflow-x-auto border-t border-slate-200">
        <table className="billing-ledger-table w-full text-left">
          <caption className="sr-only">{utility ? "Utility billing history" : "Rent payment history"}: billed amounts, collections, and balances</caption>
          <thead><tr>{["Tenant / Room","Billing Period","Billed","Collected","Balance","Status","Actions"].map((title,index)=><th key={title} scope="col" className={index >= 2 && index <= 4 ? "text-right" : index === 6 ? "text-right" : ""}>{title}</th>)}</tr></thead>
          <tbody aria-busy={loading}>{shown.map(bill=><tr key={bill.id} aria-label={`Bill for ${bill.leases?.profiles?.full_name || "Unknown tenant"}, room ${bill.leases?.rooms?.room_number || "Unassigned"}`}>
            <th scope="row"><div className="flex items-center gap-1"><span className="block max-w-[190px] truncate font-semibold text-slate-900" title={bill.leases?.profiles?.full_name}>{bill.leases?.profiles?.full_name || "Unknown tenant"}</span></div><p className="billing-history-secondary mt-1 max-w-[210px] truncate font-normal text-slate-500" title={`${bill.leases?.rooms?.buildings?.name || "Building"} / Room ${bill.leases?.rooms?.room_number || "Unassigned"}`}>{bill.leases?.rooms?.buildings?.name || "Building"} / Room {bill.leases?.rooms?.room_number || "Unassigned"}</p></th>
            <td><p className="whitespace-nowrap text-slate-700">{monthLabel(bill.billing_period)}</p><p className="billing-history-secondary mt-1 whitespace-nowrap text-slate-500">Due {formatTenantDate(bill.due_date)}</p></td>
            <td className="whitespace-nowrap text-right font-medium tabular-nums text-slate-800">{money(bill.total)}</td>
            <td className={"whitespace-nowrap text-right font-medium tabular-nums " + (bill.paid > 0 ? "text-emerald-700" : "text-slate-500")}>{money(bill.paid)}</td>
            <td className={"whitespace-nowrap text-right font-semibold tabular-nums " + (bill.displayStatus === "Late" && bill.balance > 0 ? "text-rose-700" : "text-slate-800")}>{money(bill.balance)}</td>
            <td><StatusBadge status={bill.displayStatus}/></td>
            <td className="text-right"><BillActions bill={bill} disabled={loading} onDetails={setSelected} onPayment={onPayment} onReminder={setReminder}/></td>
          </tr>)}</tbody>
        </table>
      </div>
      {!loading&&!shown.length&&<div className="px-6 py-12 text-center"><h3 className="font-semibold text-slate-800">No matching bills</h3><p className="mt-2 text-sm text-slate-500">Try a different month, search, or status.</p>{(query || status !== "All")&&<button type="button" onClick={clearFilters} className="mt-3 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50">Clear filters</button>}</div>}
      <p aria-live="polite" className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:px-5">Showing {shown.length} of {page.total} matching bills ({page.periodTotal} for {month}).</p>
      <PageControls disabled={loading} offset={filters.offset} limit={25} total={page.total} onChange={offset=>onFiltersChange({...filters,offset})}/>
    </section>
    {selected&&<Suspense fallback={<DialogLoading label="Opening payments..."/>}><BillPaymentsDialog key={selected.id} bill={selected} onClose={()=>setSelected(null)} onCorrection={onCorrection}/></Suspense>}
    {reminder&&<Suspense fallback={<DialogLoading label="Opening reminder..."/>}><ReminderDialog bill={reminder} onClose={()=>setReminder(null)} onSend={onReminder}/></Suspense>}
    {bulkReminder&&<Suspense fallback={<DialogLoading label="Opening reminder preview..."/>}><BulkReminderDialog key={type+month} month={month} type={type} onClose={()=>setBulkReminder(false)} onSaved={onRefresh}/></Suspense>}
  </>;
}
