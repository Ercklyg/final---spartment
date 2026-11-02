import { useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { money } from '../../lib/billing.js';
import { closeFromBackdrop } from '../../lib/dialog.js';

const button = "rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50";
const remindedLabel=value=>value?new Date(value).toLocaleString("en-PH",{dateStyle:"medium",timeStyle:"short"}):null;

export default function ReminderDialog({bill,onClose,onSend}) {
  const [sending,setSending]=useState(false);
  const [error,setError]=useState("");
  const tenant=bill.leases?.profiles?.full_name||"Tenant";
  const message=`This is a friendly reminder that your ${bill.bill_type} bill for ${new Date(bill.billing_period+"T00:00:00").toLocaleDateString("en-PH",{month:"long",year:"numeric"})} has a remaining balance of ${money(bill.balance)}. It was due on ${new Date(bill.due_date+"T00:00:00").toLocaleDateString("en-PH",{dateStyle:"medium"})}. Please review your billing details.`;
  const submit=async()=>{setSending(true);setError("");try{await onSend(bill);onClose();}catch(reason){setError(reason.message);}finally{setSending(false);}};
  return <div role="dialog" aria-modal="true" aria-labelledby="reminder-title" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={event=>closeFromBackdrop(event,onClose,sending)} onKeyDown={event=>{if(event.key==="Escape"&&!sending)onClose();}}>
    <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
      <div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="rounded-xl bg-amber-50 p-2.5 text-amber-600"><BellRing size={21}/></span><div><h2 id="reminder-title" className="text-lg font-bold">Send payment reminder?</h2><p className="mt-1 text-sm text-slate-500">The tenant will receive this in their notifications.</p></div></div><button type="button" aria-label="Close reminder" disabled={sending} onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={19}/></button></div>
      <dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm"><div><dt className="text-slate-500">Tenant</dt><dd className="mt-1 font-semibold">{tenant}</dd></div><div><dt className="text-slate-500">Remaining balance</dt><dd className="mt-1 font-semibold text-rose-700">{money(bill.balance)}</dd></div><div><dt className="text-slate-500">Billing month</dt><dd className="mt-1 font-semibold">{bill.billing_period.slice(0,7)}</dd></div><div><dt className="text-slate-500">Due date</dt><dd className="mt-1 font-semibold">{bill.due_date}</dd></div></dl>
      <div className="mt-4"><p className="text-sm font-medium text-slate-700">Reminder message</p><p className="mt-1 rounded-xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-600">{message}</p></div>
      {bill.last_reminded_at&&<p className="mt-3 text-xs text-slate-500">Last reminded: {remindedLabel(bill.last_reminded_at)}</p>}
      {error&&<p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={sending} onClick={onClose} className={button}>Cancel</button><button type="button" disabled={sending} onClick={submit} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"><BellRing size={16}/>{sending?"Sending…":"Send reminder"}</button></div>
    </div>
  </div>;
}
