import PageSkeleton from "../PageSkeleton.jsx";
import PaymentCorrectionDialog from "./PaymentCorrectionDialog.jsx";
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { createBill, money, recordPayment, today } from '../../lib/billing.js';
import { useRemoteData } from '../../lib/useRemoteData.js';
import BillingLedger from './BillingLedger.jsx';
const field='mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5';
const loadLeases=client=>client.get('/billing/leases');
function PaymentForm({bill,onClose,onSaved}) {
  const [form,setForm]=useState({amount:String(bill.balance),date:today(),reference:''});
  const [error,setError]=useState('');const [saving,setSaving]=useState(false);
  const attempt=useRef(null); const busy=useRef(false);
  const submit=async event=>{event.preventDefault();if(busy.current)return;busy.current=true;setSaving(true);setError('');
    const signature=JSON.stringify(form);if(attempt.current?.signature!==signature)attempt.current={signature,id:crypto.randomUUID()};
    try{await recordPayment(api,bill,form,attempt.current.id);onSaved();}catch(e){setError(e.message);}finally{busy.current=false;setSaving(false);}};
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4"><form onSubmit={submit} role="dialog" aria-modal="true" aria-label="Record payment" className="w-full max-w-md rounded-xl bg-white p-6"><h2 className="text-xl font-bold">Record payment</h2><p className="mt-1 text-sm">Remaining balance: {money(bill.balance)}</p><fieldset disabled={saving} className="mt-4 space-y-3">{[['amount','Amount','number'],['date','Payment date','date'],['reference','Reference note','text']].map(([key,label,type])=><label key={key} className="block text-sm">{label}<input type={type} required={key!=='reference'} min={key==='amount'?'0.01':undefined} max={key==='amount'?bill.balance:key==='date'?today():undefined} step={key==='amount'?'0.01':undefined} maxLength={254} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} className={field}/></label>)}{error&&<p role="alert" className="text-rose-700">{error}</p>}<div className="flex justify-end gap-3"><button type="button" onClick={onClose}>Cancel</button><button className="rounded-lg bg-blue-600 px-4 py-2 text-white">{saving?'Saving...':'Save payment'}</button></div></fieldset></form></div>;
}
export default function LiveAdminBilling({ type }) {
  const [month, setMonth] = useState(today().slice(0, 7));
  const [filters,setFilters]=useState({search:'',status:'All',offset:0});
  const [search,setSearch]=useState('');
  useEffect(()=>{const timer=setTimeout(()=>setSearch(filters.search),300);return ()=>clearTimeout(timer);},[filters.search]);
  const loader=useCallback(client=>client.get('/billing/workspace?'+new URLSearchParams({month,type,search,status:filters.status,offset:filters.offset,limit:25})),[month,type,search,filters.status,filters.offset]);
  const page=useRemoteData(loader,{keepPrevious:true});
  const leases=useRemoteData(loadLeases);
  const data=page.data&&leases.data?{...page.data,leases:leases.data}:null;
  const error=page.error||leases.error,loading=page.loading||leases.loading;
  const reload=()=>{page.reload();leases.reload();};
  const changeMonth=value=>{setMonth(value);setFilters(f=>({...f,offset:0}));};
  const [form, setForm] = useState({ lease: '', period: today().slice(0, 7), due: today(), rent: '', electricity: '', water: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const busy = useRef(false);
  const [payment, setPayment] = useState(null);
  const [correction, setCorrection] = useState(null);
  const all = type === 'rent' && form.lease === 'all';

  const submit = async event => {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setMessage('');
    setResult(null);
    try {
      const response = await createBill(api, { ...form, type });
      if (response.bulk) setResult(response);
      changeMonth(form.period);
      reload();
    } catch (e) { setMessage(e.message); }
    finally { busy.current = false; setSaving(false); }
  };

  if (loading&&!data) return <PageSkeleton variant="billing" label="Loading billing..."/>;
  if (error) return <p role="alert" className="py-6 text-rose-700">{error} <button onClick={reload} className="underline">Retry</button></p>;

  const createForm = <form onSubmit={submit} aria-busy={saving} className="rounded-xl border border-slate-200 bg-white p-5">
    <h2 className="font-bold">Create {type} bill</h2>
    <fieldset disabled={saving} className="mt-3 grid gap-3 sm:grid-cols-3">
      <label className="text-sm">Tenant / room
        <select required value={form.lease} onChange={event => {
          const lease = data.leases.find(item => item.id === event.target.value);
          setForm({ ...form, lease: event.target.value, rent: lease?.rent == null ? '' : String(lease.rent) });
        }} className={field}>
          <option value="">Select active lease</option>
          {type === 'rent' && <option value="all" disabled={!data.leases.length}>All tenants / rooms ({data.leases.length})</option>}
          {data.leases.map(lease => <option key={lease.id} value={lease.id}>{lease.profiles?.full_name} / {lease.rooms?.buildings?.name} / {lease.rooms?.room_number}</option>)}
        </select>
      </label>
      {[['period', 'Billing month', 'month'], ['due', 'Due date', 'date'],
        ...(type === 'rent' ? (all ? [] : [['rent', 'Rent amount', 'number']])
          : [['electricity', 'Electricity', 'number'], ['water', 'Water', 'number']])
      ].map(([key, label, inputType]) => <label key={key} className="text-sm">{label}
        <input required type={inputType} min={inputType === 'number' ? '0' : undefined} step={inputType === 'number' ? '0.01' : undefined} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} className={field} />
      </label>)}
      {all && type === 'rent' && <label className="text-sm">Rent amount<input readOnly value="Each tenant's saved monthly rent" className={field + " text-slate-600"} /></label>}
      <button disabled={!data.leases.length || !form.lease} className="self-end rounded-lg bg-blue-600 p-3 font-semibold text-white disabled:opacity-50">
        {saving ? (all ? 'Creating bills...' : 'Saving...') : all ? 'Create bills for all (' + data.leases.length + ')' : 'Create bill'}
      </button>
    </fieldset>
    {all && <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
      <p>One rent bill per active tenant, using their saved monthly rent.</p>
      <p className="mt-1">The billing month and due date apply to everyone. Existing bills of this type for the month will be skipped.</p>
    </div>}
    {!data.leases.length && <p className="mt-3 text-sm text-slate-500">Add a tenant with an active lease first.</p>}
    {saving && <p role="status" className="mt-3 text-sm text-blue-700">Creating {all ? 'bills for all active tenants' : 'bill'}...</p>}
    {message && <p role="alert" className="mt-3 text-rose-700">{message}</p>}
    {result && <div role={result.failures.length ? "alert" : "status"} className={"mt-3 rounded-lg p-3 text-sm " + (result.failures.length ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-800")}>
      <p className="font-semibold">{result.message}</p>
      {result.failures.length > 0 && <><p className="mt-1">Resolve the issues below and submit All again. Bills already created will be skipped.</p><ul className="mt-2 list-disc space-y-1 pl-5">{result.failures.map(failure => <li key={failure.lease}>{failure.name} / Room {failure.room}: {failure.message}</li>)}</ul></>}
    </div>}
  </form>;

  return <><BillingLedger type={type} bills={data.bills} summary={data.summary} month={month} onMonthChange={changeMonth} page={data} loading={page.loading||search!==filters.search} filters={filters} onFiltersChange={setFilters} createForm={createForm} onRefresh={reload} onPayment={setPayment} onCorrection={setCorrection} />
    {correction && <PaymentCorrectionDialog payment={correction} onClose={() => setCorrection(null)} onSaved={() => { setCorrection(null); reload(); }} />}
    {payment && <PaymentForm bill={payment} onClose={() => setPayment(null)} onSaved={() => { setPayment(null); reload(); }} />}
  </>;
}
