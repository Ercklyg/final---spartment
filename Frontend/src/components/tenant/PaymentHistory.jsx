import PageSkeleton from "../PageSkeleton.jsx";
import { useState } from "react";
import { ArrowRight, FileText } from "lucide-react";
import PaymentReceiptDialog from "./PaymentReceiptDialog.jsx";
import { money } from "../../lib/billing.js";
import { formatTenantDate } from "../../lib/tenantAccount.js";

function RecordedStatus() {
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"><span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />Recorded</span>;
}

export default function PaymentHistory({ bills, hasData, loading, error, onRetry, onViewAll }) {
  const [receiptId, setReceiptId] = useState(null);
  const payments = bills.flatMap(bill => bill.payments.map(payment => ({ ...payment, period: bill.billing_period })))
    .sort((a, b) => b.payment_date.localeCompare(a.payment_date)).slice(0, 4);
  const paymentMonth = payment => new Date(payment.period + "T00:00:00").toLocaleDateString("en-PH", { month: "long", year: "numeric" });
  return <>
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.28)] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-base font-bold tracking-tight text-slate-900">Payment history</h2><button type="button" onClick={onViewAll} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 hover:text-blue-700">View all <ArrowRight size={14} /></button></div>
      {loading && hasData && <p role="status" className="mb-3 text-[11px] font-medium text-blue-600">Refreshing payments…</p>}
      {loading && !hasData ? <PageSkeleton variant="table" label="Loading payments..."/> : error && !hasData ? <p role="alert" className="text-xs text-rose-700">{error} <button onClick={onRetry} className="underline">Retry</button></p> : <>
        {error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">Could not refresh: {error} <button onClick={onRetry} className="font-semibold underline">Retry</button></p>}
        <ul className="space-y-2 sm:hidden" aria-label="Recent payments">
          {payments.map(payment => <li key={payment.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Month</p><p className="truncate text-sm font-bold text-slate-900">{paymentMonth(payment)}</p></div>
              <div className="shrink-0 text-[10px]"><RecordedStatus /></div>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 text-xs">
              <div><dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Amount</dt><dd className="mt-0.5 font-bold tabular-nums text-slate-900">{money(payment.amount)}</dd></div>
              <div><dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Date paid</dt><dd className="mt-0.5 text-slate-700">{formatTenantDate(payment.payment_date)}</dd></div>
            </dl>
            <button type="button" onClick={() => setReceiptId(payment.id)} className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-blue-100 bg-white px-3 text-xs font-semibold text-blue-600 hover:border-blue-200 hover:bg-blue-50"><FileText size={14} />View receipt</button>
          </li>)}
          {!payments.length && <li className="py-4 text-center text-xs text-slate-500">No payments recorded yet.</li>}
        </ul>
        <div className="hidden sm:block">
        <table className="w-full table-fixed text-left text-xs">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr>{["Month", "Amount", "Status", "Date Paid", "Receipt"].map(head => <th key={head} className="px-3 py-3 font-semibold first:rounded-l-xl last:rounded-r-xl">{head}</th>)}</tr></thead>
          <tbody>{payments.map(payment => <tr key={payment.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/60">
            <td className="px-3 py-3.5 font-semibold text-slate-900">{paymentMonth(payment)}</td>
            <td className="px-3 py-3.5 font-bold tabular-nums text-slate-900">{money(payment.amount)}</td>
            <td className="px-3 py-3.5"><RecordedStatus /></td>
            <td className="px-3 py-3.5 text-slate-600">{formatTenantDate(payment.payment_date)}</td>
            <td className="px-3 py-3.5"><button type="button" onClick={() => setReceiptId(payment.id)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 font-semibold text-blue-600 hover:bg-blue-50"><FileText size={15} /><span className="hidden md:inline">View </span>receipt</button></td>
          </tr>)}{!payments.length && <tr><td colSpan={5} className="py-4 text-center text-slate-500">No payments recorded yet.</td></tr>}</tbody>
        </table>
        </div>
      </>}
    </section>
    {receiptId && <PaymentReceiptDialog key={receiptId} paymentId={receiptId} onClose={() => setReceiptId(null)} />}
  </>;
}
