import CalendarInput from "../CalendarInput.jsx";
import { useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { money, recordPayment, today } from '../../lib/billing.js';
import { closeFromBackdrop } from '../../lib/dialog.js';
import { useOnlineStatus } from '../../lib/useOnlineStatus.js';

const field='mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5';

export default function RecordPaymentForm({bill,onClose,onSaved}) {
  const online=useOnlineStatus();
  const [form,setForm]=useState({amount:String(bill.balance),date:today(),reference:''});
  const [error,setError]=useState('');const [saving,setSaving]=useState(false);
  const attempt=useRef(null); const busy=useRef(false);
  const submit=async event=>{event.preventDefault();if(!online){setError('You are offline. Reconnect before recording a payment.');return;}if(busy.current)return;busy.current=true;setSaving(true);setError('');
    const signature=JSON.stringify(form);if(attempt.current?.signature!==signature)attempt.current={signature,id:crypto.randomUUID()};
    try{await recordPayment(api,bill,form,attempt.current.id);onSaved();}catch(e){setError(e.message);}finally{busy.current=false;setSaving(false);}};
  return <div onMouseDown={event=>closeFromBackdrop(event,onClose,saving)} className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4"><form onSubmit={submit} role="dialog" aria-modal="true" aria-label="Record payment" className="w-full max-w-md rounded-xl bg-white p-5 sm:p-6"><h2 className="text-xl font-bold">Record payment</h2><p className="mt-1 text-sm">Remaining balance: {money(bill.balance)}</p><fieldset disabled={saving} className="mt-4 space-y-3">{[['amount','Amount','number'],['date','Payment date','date'],['reference','Reference note','text']].map(([key,label,type])=><label key={key} className="block text-sm">{label}<CalendarInput label={label} type={type} required={key!=='reference'} min={key==='amount'?'0.01':undefined} max={key==='amount'?bill.balance:key==='date'?today():undefined} step={key==='amount'?'0.01':undefined} maxLength={254} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} className={field}/></label>)}{error&&<p role="alert" className="text-rose-700">{error}</p>}<div className="grid grid-cols-2 gap-2 text-sm sm:flex sm:justify-end sm:gap-3"><button type="button" onClick={onClose}>Cancel</button><button disabled={!online||saving} className="rounded-lg bg-blue-600 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50 sm:px-4">{saving?'Saving...':online?'Save payment':'Reconnect to save'}</button></div></fieldset></form></div>;
}
