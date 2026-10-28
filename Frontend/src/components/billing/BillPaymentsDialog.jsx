import { useEffect, useRef, useState } from 'react';
import { FileText, X } from 'lucide-react';
import { money } from '../../lib/billing.js';
import { formatTenantDate } from '../../lib/tenantAccount.js';
import PaymentReceiptDialog from '../tenant/PaymentReceiptDialog.jsx';

export default function BillPaymentsDialog({ bill, onClose, onCorrection }) {
  const dialog = useRef(null);
  const [receiptId, setReceiptId] = useState(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current.showModal();
    return () => previous?.focus();
  }, []);
  return <>
    <dialog ref={dialog} onCancel={onClose} aria-labelledby="bill-payments-heading" className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl backdrop:bg-slate-950/40 sm:p-6">
      <div className="flex items-center justify-between gap-3"><h2 id="bill-payments-heading" className="text-xl font-bold">Payments and receipts</h2><button type="button" onClick={onClose} aria-label="Close payments" className="rounded-lg p-2 hover:bg-slate-100"><X size={20} /></button></div>
      <p className="mt-2 text-sm capitalize text-slate-500">{bill.bill_type} · {bill.billing_period.slice(0, 7)} · Due {formatTenantDate(bill.due_date)}</p>
      <div className="mt-4 flex flex-wrap gap-4 rounded-xl bg-slate-50 p-4 text-sm"><span>Total <strong>{money(bill.total)}</strong></span><span>Paid <strong>{money(bill.paid)}</strong></span><span>Balance <strong>{money(bill.balance)}</strong></span></div>
      {!bill.payments.length ? <p className="mt-5 text-sm text-slate-500">No payments recorded yet. A receipt will be available once a payment is recorded.</p> : <div className="mt-4 divide-y divide-slate-100">{bill.payments.map(payment => <article key={payment.id} className="py-4">
        <div className="flex justify-between gap-3"><strong>{money(payment.amount)}</strong><span className="text-sm text-slate-500">{formatTenantDate(payment.payment_date)}</span></div>
        <p className="mt-1 break-words text-sm text-slate-500">{payment.reference_note || 'No reference note'}</p>
        <div className="mt-3 flex flex-wrap gap-4"><button type="button" onClick={() => setReceiptId(payment.id)} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"><FileText size={16} />View / print receipt</button>{onCorrection && <button type="button" onClick={() => { onClose(); onCorrection(payment); }} className="text-sm text-amber-700 hover:underline">Correct payment / history</button>}</div>
      </article>)}</div>}
    </dialog>
    {receiptId && <PaymentReceiptDialog key={receiptId} paymentId={receiptId} onClose={() => setReceiptId(null)} />}
  </>;
}
