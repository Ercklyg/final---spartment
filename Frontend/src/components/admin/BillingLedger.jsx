import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { money, today } from "../../lib/billing.js";
import PageControls from "../PageControls.jsx";
import { BellRing, RefreshCw, Search, X } from "lucide-react";

const BillPaymentsDialog = lazy(() => import("../billing/BillPaymentsDialog.jsx"));
const ReminderDialog = lazy(() => import("./ReminderDialog.jsx"));

const colors = { Paid: "bg-emerald-50 text-emerald-700", Pending: "bg-amber-50 text-amber-700", "Partially paid": "bg-orange-50 text-orange-700", Late: "bg-rose-50 text-rose-700" };
const field = "w-full rounded-lg border border-slate-300 bg-white p-2 text-sm";
const button = "rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50";
const cardTones = {
  Electricity: "border-t-blue-500 bg-blue-50/35",
  Water: "border-t-cyan-500 bg-cyan-50/35",
  "Total billed": "border-t-blue-500 bg-blue-50/35",
  Collected: "border-t-emerald-500 bg-emerald-50/35",
  Balance: "border-t-amber-500 bg-amber-50/35",
  "Overdue balance": "border-t-rose-500 bg-rose-50/35",
};
const statuses = ["All", "Paid", "Pending", "Partially paid", "Late"];

function StatusBadge({ status }) {
  return <span className={"inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium " + colors[status]}><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current"/>{status}</span>;
}

const reminderDateFormatter = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" });
const remindedLabel=value=>value?reminderDateFormatter.format(new Date(value)):null;
const DialogLoading = ({ label }) => <div role="status" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4"><p className="rounded-xl bg-white px-5 py-4 text-sm font-medium text-slate-700">{label}</p></div>;

function useDesktopBillingLayout() {
  const query = "(min-width: 1024px)";
  const [desktop, setDesktop] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = event => setDesktop(event.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return desktop;
}

export default function BillingLedger({ type, bills, summary, onPayment, onReminder, onCorrection, onRefresh, createForm, month, onMonthChange, page, loading=false, filters, onFiltersChange }) {
  const query=filters.search,status=filters.status;
  const setQuery=search=>onFiltersChange({...filters,search,offset:0});
  const setStatus=status=>onFiltersChange({...filters,status,offset:0});
  const [selected,setSelected]=useState(null);
  const [reminder,setReminder]=useState(null);
  const desktop=useDesktopBillingLayout();
  const utility=type==="utility";
  const shown=useMemo(()=>bills.filter(bill=>bill.bill_type===type&&bill.billing_period.startsWith(month)),[bills,type,month]);
  const totals=summary.months[month]?.[type];
  const cards=useMemo(()=>utility?[["Electricity",totals?.electricity],["Water",totals?.water],["Collected",totals?.paid],["Balance",totals?.balance]]:[["Total billed",totals?.total],["Collected",totals?.paid],["Balance",totals?.balance],["Overdue balance",totals?.overdue]],[utility,totals]);
  const openDetails = (event, bill) => {
    event.preventDefault();
    event.stopPropagation();
    setSelected(bill);
  };

  return <>
    <div className="billing-deferred-panel mt-5">{createForm}</div>
    <div className="billing-deferred-panel mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">{cards.map(([label,value])=><article key={label} className={"min-w-0 rounded-xl border border-t-4 border-slate-200 p-4 shadow-sm sm:p-5 " + cardTones[label]}><p className="text-xs font-medium text-slate-600 sm:text-sm">{label}</p><h2 className="mt-1 break-words text-xl font-bold text-slate-950 sm:mt-2 sm:text-2xl">{money(value)}</h2></article>)}</div>
    <section className="billing-deferred-panel mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-xl font-bold">{utility?"Utility bills":"Rent payment history"}</h2><p className="text-sm text-slate-600">Status updates from payments and due dates.</p></div>
          <button type="button" onClick={onRefresh} disabled={loading} className={button + " inline-flex items-center gap-2 font-medium text-slate-700"}><RefreshCw size={16} className={loading?"animate-spin":""}/>Refresh</button>
        </div>
        <div className="mt-4 grid items-end gap-3 md:grid-cols-[180px_minmax(240px,1fr)] lg:grid-cols-[180px_minmax(260px,1fr)_auto]">
          <label className="text-sm font-medium text-slate-700">Month<input type="month" value={month} onChange={event=>onMonthChange(event.target.value || today().slice(0,7))} className={field + " mt-1.5"}/></label>
          <label className="text-sm font-medium text-slate-700">Search tenant or room<span className="relative mt-1.5 block"><Search aria-hidden="true" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input aria-label="Search tenant or room" placeholder="Search by tenant name or room" value={query} onChange={event=>setQuery(event.target.value)} className={field + " pl-10 pr-10"}/>{query&&<button type="button" aria-label="Clear search" onClick={()=>setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={17}/></button>}</span></label>
          <div className="flex flex-wrap gap-2 md:col-span-2 lg:col-span-1" aria-label="Filter bills by status">
            {statuses.map(value=><button key={value} type="button" aria-pressed={status===value} onClick={()=>setStatus(value)} className={"rounded-full border px-3 py-1.5 text-sm font-medium transition-colors "+(status===value?"border-blue-600 bg-blue-600 text-white shadow-sm":"border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700")}>{value}</button>)}
          </div>
        </div>
      </div>

      {loading&&<div role="status" aria-live="polite" className="border-t border-blue-100 bg-blue-50/50"><div className="h-1 w-full animate-pulse bg-blue-500"/><p className="px-4 py-2 text-xs font-medium text-blue-700 sm:px-5">Updating billing records…</p></div>}

      {!desktop&&<div className="divide-y divide-slate-200 border-t border-slate-200">
        {shown.map(bill=><article key={bill.id} className="billing-mobile-record p-4 sm:p-5">
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
          {bill.last_reminded_at&&<p className="mt-3 text-xs text-slate-500">Last reminded: {remindedLabel(bill.last_reminded_at)}</p>}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {bill.balance>0&&<button type="button" disabled={loading} onClick={()=>onPayment(bill)} className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700">Record payment</button>}
            {bill.balance>0&&<button type="button" disabled={loading} onClick={()=>setReminder(bill)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100"><BellRing size={16}/><span>Send reminder</span></button>}
            <button type="button" disabled={loading} onClick={event=>openDetails(event,bill)} className={button + " col-span-full w-full bg-white font-medium text-slate-700"}>{bill.payments.length?"Payments / receipts":"View details"}</button>
          </div>
        </article>)}
        {!loading&&!shown.length&&<p className="p-8 text-center text-sm text-slate-500">No bills match this month or search.</p>}
      </div>}

      {desktop&&<div className="w-full"><table className="billing-ledger-table w-full table-fixed text-left text-sm"><thead><tr>{["Tenant / Room","Period / Due date",...(utility?["Electricity","Water"]:[]),"Total","Paid","Balance","Status","Actions"].map(title=><th key={title} className={["Electricity","Water","Total","Paid","Balance"].includes(title)?"text-right":title==="Actions"?"w-[390px] text-center":""}>{title}</th>)}</tr></thead>
        <tbody aria-busy={loading}>{shown.map(bill=><tr key={bill.id} className="border-t border-slate-200 transition-colors hover:bg-blue-50/50">
          <td><strong>{bill.leases?.profiles?.full_name || "Unknown tenant"}</strong><p className="text-slate-600">{bill.leases?.rooms?.buildings?.name} / Room {bill.leases?.rooms?.room_number || "Unassigned"}</p></td>
          <td><p>{bill.billing_period.slice(0,7)}</p><p className="whitespace-nowrap text-sm text-slate-600">Due {bill.due_date}</p></td>
          {utility&&<><td className="text-right tabular-nums">{money(bill.electricity_amount)}</td><td className="text-right tabular-nums">{money(bill.water_amount)}</td></>}
          <td className="text-right font-medium tabular-nums">{money(bill.total)}</td><td className="text-right font-medium text-emerald-700 tabular-nums">{money(bill.paid)}</td><td className={"text-right font-semibold tabular-nums "+(bill.balance>0?"text-rose-700":"text-emerald-700")}>{money(bill.balance)}</td>
          <td><StatusBadge status={bill.displayStatus}/></td>
          <td className="w-[390px]"><div className={"grid gap-1.5 " + (bill.balance>0?"grid-cols-[1.08fr_0.72fr_1.2fr]":"grid-cols-1")}>{bill.balance>0&&<button type="button" disabled={loading} onClick={()=>onPayment(bill)} className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-lg bg-blue-600 px-1.5 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700">Record payment</button>}{bill.balance>0&&<button type="button" disabled={loading} onClick={()=>setReminder(bill)} className="inline-flex w-full items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-amber-300 bg-amber-50 px-1.5 py-2 text-[13px] font-semibold text-amber-800 transition-colors hover:bg-amber-100"><BellRing size={14}/>Remind</button>}<button type="button" disabled={loading} onClick={event=>openDetails(event,bill)} className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-lg border border-slate-300 bg-white px-1.5 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50">{bill.payments.length?"Payments / receipts":"View details"}</button>{bill.last_reminded_at&&<span className="col-span-full text-center text-xs text-slate-500">Last reminded {remindedLabel(bill.last_reminded_at)}</span>}</div></td>
        </tr>)}{!loading&&!shown.length&&<tr><td colSpan={utility?9:7} className="p-8 text-center text-slate-500">No bills match this month or search.</td></tr>}</tbody>
      </table></div>}
      <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:px-5">Showing {shown.length} of {page.total} matching bills ({page.periodTotal} for {month}).</p>
      <PageControls disabled={loading} offset={filters.offset} limit={25} total={page.total} onChange={offset=>onFiltersChange({...filters,offset})}/>
    </section>
    {selected&&<Suspense fallback={<DialogLoading label="Opening payments…"/>}><BillPaymentsDialog key={selected.id} bill={selected} onClose={()=>setSelected(null)} onCorrection={onCorrection}/></Suspense>}
    {reminder&&<Suspense fallback={<DialogLoading label="Opening reminder…"/>}><ReminderDialog bill={reminder} onClose={()=>setReminder(null)} onSend={onReminder}/></Suspense>}
  </>;
}
