import PageSkeleton from "../PageSkeleton.jsx";
import { useState } from "react";
import { CalendarDays, FileText, Info } from "lucide-react";
import PaymentReceiptDialog from "./PaymentReceiptDialog.jsx";
import { money } from "../../lib/billing.js";
import { formatTenantDate } from "../../lib/tenantAccount.js";

export default function CurrentBill({ bill, loading, error, onRetry, onViewBilling }) {
  const [receiptId, setReceiptId] = useState(null);
  const payment = bill?.payments?.toSorted((a, b) => b.payment_date.localeCompare(a.payment_date))[0];
  const statusClass = bill?.displayStatus === "Paid" ? "bg-emerald-50 text-emerald-600" : bill?.displayStatus === "Late" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-700";
  return <>
    <section className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
      <div className="flex items-start justify-between">
        <div><h2 className="text-sm font-bold text-slate-900">Current bill</h2>{bill && <p className="mt-0.5 text-[11px] capitalize text-slate-500">{bill.bill_type} · {new Date(bill.billing_period + "T00:00:00").toLocaleDateString("en-PH", { month: "long", year: "numeric" })}</p>}</div>
        {bill && <span className={"rounded-full px-3 py-1 text-[11px] font-medium " + statusClass}>{bill.displayStatus}</span>}
      </div>
      {loading ? <PageSkeleton variant="bill" label="Loading bill..."/>
        : error ? <p role="alert" className="mt-4 text-xs text-rose-700">{error} <button onClick={onRetry} className="underline">Retry</button></p>
          : !bill ? <p className="mt-4 text-xs text-slate-500">No bills have been issued yet.</p>
            : <>
              <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
                <div><p className="text-[11px] text-slate-500">Amount due</p><p className="text-2xl font-extrabold tracking-tight">{money(bill.balance)}</p></div>
                <div className="hidden h-10 w-px bg-slate-200 md:block" />
                <div><p className="text-[11px] text-slate-500">Due date</p><p className="font-bold text-slate-800">{formatTenantDate(bill.due_date)}</p><span className={"mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] " + statusClass}><CalendarDays size={11} />{bill.displayStatus}</span></div>
                <div className="flex gap-2 md:ml-auto">
                  {payment && <button type="button" onClick={() => setReceiptId(payment.id)} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"><FileText size={15} />View receipt</button>}
                  <button type="button" onClick={onViewBilling} className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50"><FileText size={15} />View billing</button>
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-blue-50 px-3 py-2.5 text-xs leading-5 text-blue-800"><div className="flex items-center gap-2 font-semibold"><Info size={14} />Payment instructions</div><p className="mt-1 pl-5">Payments are processed offline. Please pay the building admin and keep your receipt for verification.</p></div>
            </>}
    </section>
    {receiptId && <PaymentReceiptDialog key={receiptId} paymentId={receiptId} onClose={() => setReceiptId(null)} />}
  </>;
}
