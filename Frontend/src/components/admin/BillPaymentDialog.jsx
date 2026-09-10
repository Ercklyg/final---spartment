import { useEffect, useRef, useState } from "react";
import { balance, cents, money, paid, today, total, validatePayment } from "./billingPayments.js";

const field = "mt-1 w-full rounded-lg border border-slate-300 p-2";
const button = "rounded-lg border border-slate-300 px-3 py-2";

export default function BillPaymentDialog({ bill, kind, onClose, onRecord, onVoid }) {
  const dialog = useRef(null);
  const [amount, setAmount] = useState(String(balance(bill) / 100));
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [correction, setCorrection] = useState(null);
  const [reason, setReason] = useState("");
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current.showModal();
    return () => previous?.focus();
  }, []);

  const download = () => {
    const lines = ["SPARTMENT — PAYMENT RECEIPT", "Payment record", `${kind} • ${bill.period}`, `${bill.name} • Room ${bill.room}`, `Bill: ${bill.id}`, `Due: ${bill.due}`, `Charges: ${money(total(bill))}`, `Received: ${money(paid(bill))}`, `Balance: ${money(balance(bill))}`, "", ...bill.payments.filter(p => !p.voided).map(p => `${p.id} | ${p.date} | ${money(p.amount)} | ${p.note || "—"}`)];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = `${bill.id}-receipt.txt`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <dialog ref={dialog} onCancel={onClose} aria-labelledby="bill-payment-title" className="admin-billing m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-950/40">
    <div className="flex items-center justify-between gap-3"><h2 id="bill-payment-title" className="text-xl font-bold">{balance(bill) ? "Record payment" : "Payment receipt"}</h2><button type="button" onClick={onClose} className={button}>Close</button></div>
    <div className="my-4 rounded-xl border border-slate-200 p-4">
      <p className="font-bold">Spartment · {kind}</p><p>{bill.name} · Room {bill.room}</p><p>{bill.period} · Due {bill.due}</p>
      <p className="mt-3">Charges: {money(total(bill))}</p><p>Received: {money(paid(bill))}</p><p className="font-semibold">Remaining balance: {money(balance(bill))}</p>
      <p className="mt-2 text-sm text-slate-600">Payment record.</p>
      {paid(bill) > 0 && <button type="button" onClick={download} className={`${button} mt-3`}>Download receipt (.txt)</button>}
    </div>
    <h3 className="font-semibold">Payment history</h3>
    {!bill.payments.length && <p className="text-slate-600">No payments recorded.</p>}
    {bill.payments.map(payment => <div key={payment.id} className="my-2 rounded-lg border border-slate-200 p-3">
      <p className="font-semibold">{money(payment.amount)} · {payment.date}</p><p className="break-all text-sm text-slate-600">{payment.id}</p>
      {payment.note && <p className="break-words">{payment.note}</p>}
      {payment.voided ? <p className="text-rose-700">Voided: {payment.reason}</p> : <button type="button" className={`${button} mt-2`} onClick={() => { setCorrection(payment.id); setReason(""); setError(""); }}>Correct payment</button>}
    </div>)}
    {correction ? <form className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4" onSubmit={event => {
      event.preventDefault();
      if (!reason.trim()) { setError("Enter a reason for the correction."); return; }
      onVoid(correction, reason.trim()); setCorrection(null); setError("");
    }}>
      <p>Void this payment? Its amount will be restored to the balance. The original stays in history; record the corrected payment afterward.</p>
      <label className="mt-3 block">Reason<input required maxLength={250} value={reason} onChange={e => setReason(e.target.value)} className={field}/></label>
      <div className="mt-3 flex gap-2"><button className={button} type="button" onClick={() => setCorrection(null)}>Cancel</button><button className={button} type="submit">Confirm void</button></div>
    </form> : balance(bill) > 0 && <form className="mt-5" onSubmit={event => {
      event.preventDefault(); const problem = validatePayment(bill, amount, date);
      if (problem) { setError(problem); return; }
      onRecord({ id: `PAY-${crypto.randomUUID()}`, amount: cents(amount), date, note: note.trim() });
      setAmount(""); setNote(""); setError("");
    }}>
      <label className="block">Amount received (PHP)<input required type="number" min="0.01" max={balance(bill)/100} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={field}/></label>
      <label className="mt-3 block">Payment date<input required type="date" min={`${bill.period}-01`} max={today()} value={date} onChange={e => setDate(e.target.value)} className={field}/></label>
      <label className="mt-3 block">Reference or note (optional)<input maxLength={250} value={note} onChange={e => setNote(e.target.value)} className={field}/></label>
      <p className="my-3 font-semibold">Balance after payment: {cents(amount) !== null && cents(amount) <= balance(bill) ? money(balance(bill) - cents(amount)) : "Enter a valid amount"}</p>
      <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-white">Confirm payment</button>
    </form>}
    {error && <p role="alert" className="mt-3 text-rose-700">{error}</p>}
  </dialog>;
}
