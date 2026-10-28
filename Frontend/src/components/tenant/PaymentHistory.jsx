import PageSkeleton from "../PageSkeleton.jsx";
import { useState } from "react";
import { ArrowRight, FileText } from "lucide-react";
import PaymentReceiptDialog from "./PaymentReceiptDialog.jsx";
import { money } from "../../lib/billing.js";
import { formatTenantDate } from "../../lib/tenantAccount.js";

function RecordedStatus() {
  return <span className="inline-flex items-center whitespace-nowrap rounded-full bg-emerald-50 px-2 py-1 text-emerald-600"><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />Recorded</span>;
}

export default function PaymentHistory({ bills, loading, error, onRetry, onViewAll }) {
  const [receiptId, setReceiptId] = useState(null);
  const payments = bills.flatMap(bill => bill.payments.map(payment => ({ ...payment, period: bill.billing_period })))
    .sort((a, b) => b.payment_date.localeCompare(a.payment_date)).slice(0, 4);
  const paymentMonth = payment => new Date(payment.period + "T00:00:00").toLocaleDateString("en-PH", { month: "long", year: "numeric" });
  return <>
    <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
      <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold text-slate-900">Payment history</h2><button type="button" onClick={onViewAll} className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700">View all <ArrowRight size={14} /></button></div>
      {loading ? <PageSkeleton variant="table" label="Loading payments..."/> : error ? <p role="alert" className="text-xs text-rose-700">{error} <button onClick={onRetry} className="underline">Retry</button></p> : <>
        <ul className="divide-y divide-slate-100 sm:hidden" aria-label="Recent payments">
          {payments.map(payment => <li key={payment.id} className="py-3 first:pt-1 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="text-[10px] text-slate-500">Month</p><p className="truncate text-xs font-semibold text-slate-800">{paymentMonth(payment)}</p></div>
              <div className="shrink-0 text-[10px]"><RecordedStatus /></div>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-3 text-[11px]">
              <div><dt className="text-[10px] text-slate-500">Amount</dt><dd className="font-semibold text-slate-800">{money(payment.amount)}</dd></div>
              <div><dt className="text-[10px] text-slate-500">Date paid</dt><dd className="text-slate-700">{formatTenantDate(payment.payment_date)}</dd></div>
            </dl>
            <button type="button" onClick={() => setReceiptId(payment.id)} className="mt-2 flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline"><FileText size={13} />View receipt</button>
          </li>)}
          {!payments.length && <li className="py-4 text-center text-xs text-slate-500">No payments recorded yet.</li>}
        </ul>
        <div className="hidden sm:block">
        <table className="w-full table-fixed text-left text-[11px]">
          <thead className="bg-slate-50 text-slate-500"><tr>{["Month", "Amount", "Status", "Date Paid", "Receipt"].map(head => <th key={head} className="px-2 py-2 font-medium first:rounded-l-md last:rounded-r-md">{head}</th>)}</tr></thead>
          <tbody>{payments.map(payment => <tr key={payment.id} className="border-b border-slate-100 last:border-0">
            <td className="px-2 py-2.5 font-medium text-slate-800">{paymentMonth(payment)}</td>
            <td className="px-2 py-2.5 font-semibold text-slate-800">{money(payment.amount)}</td>
            <td className="px-2 py-2.5"><RecordedStatus /></td>
            <td className="px-2 py-2.5 text-slate-500">{formatTenantDate(payment.payment_date)}</td>
            <td className="px-2 py-2.5"><button type="button" onClick={() => setReceiptId(payment.id)} className="flex items-center gap-1 text-blue-600 hover:underline"><FileText size={14} /><span className="hidden md:inline">View </span>receipt</button></td>
          </tr>)}{!payments.length && <tr><td colSpan={5} className="py-4 text-center text-slate-500">No payments recorded yet.</td></tr>}</tbody>
        </table>
        </div>
      </>}
    </section>
    {receiptId && <PaymentReceiptDialog key={receiptId} paymentId={receiptId} onClose={() => setReceiptId(null)} />}
  </>;
}
