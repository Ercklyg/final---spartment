import PageSkeleton from "../PageSkeleton.jsx";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { createBill, monthEnd, sendPaymentReminder, today } from '../../lib/billing.js';
import { useRemoteData } from '../../lib/useRemoteData.js';
import { useSessionState } from '../../lib/useSessionState.js';
import BillingLedger from './BillingLedger.jsx';
import { ChevronDown, Search } from 'lucide-react';
const field='mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5';
const PaymentCorrectionDialog = lazy(() => import('./PaymentCorrectionDialog.jsx'));
const RecordPaymentForm = lazy(() => import('./RecordPaymentForm.jsx'));
const DialogLoading = ({ label }) => <div role="status" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4"><p className="rounded-xl bg-white px-5 py-4 text-sm font-medium text-slate-700">{label}</p></div>;
function LeasePicker({ leases, value, includeAll, disabled, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const root = useRef(null);
  const searchInput = useRef(null);
  useEffect(() => {
    if (!open) return;
    searchInput.current?.focus();
    const closeOutside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);
  const label = lease => `${lease.profiles?.full_name || 'Tenant'} / ${lease.rooms?.buildings?.name || 'Building'} / ${lease.rooms?.room_number || 'Room'}`;
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return leases.filter(lease => label(lease).toLowerCase().includes(normalizedQuery));
  }, [leases, query]);
  const selected = value === 'all' ? `All tenants / rooms (${leases.length})` : label(leases.find(lease => lease.id === value) || {});
  return <div ref={root} className="relative mt-1">
    <button type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} onClick={() => { setOpen(current => !current); setQuery(''); }} className={`${field} flex h-11 items-center justify-between text-left disabled:cursor-not-allowed disabled:opacity-60`}>
      <span className={value ? 'truncate text-slate-900' : 'text-slate-500'}>{value ? selected : 'Select active lease'}</span><ChevronDown size={18} className="shrink-0 text-slate-600" />
    </button>
    {open && <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-100 p-2.5"><div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"><Search size={16} className="shrink-0 text-slate-400" /><input ref={searchInput} type="search" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }} placeholder="Search tenant or room..." aria-label="Search active tenants and rooms" className="lease-picker-search min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none focus:ring-0" /></div></div>
      <div role="listbox" aria-label="Active leases" className="max-h-60 overflow-y-auto p-1.5">
        {includeAll && <button type="button" role="option" aria-selected={value === 'all'} onClick={() => { onChange('all'); setOpen(false); setQuery(''); }} className="w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-blue-50">All tenants / rooms ({leases.length})</button>}
        {filtered.map(lease => <button key={lease.id} type="button" role="option" aria-selected={value === lease.id} onClick={() => { onChange(lease.id); setOpen(false); setQuery(''); }} className="w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-blue-50"><span className="block truncate font-medium">{lease.profiles?.full_name || 'Tenant'}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{lease.rooms?.buildings?.name || 'Building'} / Room {lease.rooms?.room_number || '—'}</span></button>)}
        {!filtered.length && <p className="px-3 py-4 text-center text-sm text-slate-500">No matching tenant or room.</p>}
      </div>
    </div>}
  </div>;
}
export default function LiveAdminBilling({ type }) {
  const [month, setMonth] = useSessionState(`admin-billing-${type}-month`,today().slice(0, 7));
  const [filters,setFilters]=useSessionState(`admin-billing-${type}-filters`,{search:'',status:'All',offset:0});
  const [search,setSearch]=useState('');
  const [form, setForm] = useState({ lease: '', period: today().slice(0, 7), due: monthEnd(today().slice(0, 7)), rent: '', electricity: '', water: '' });
  useEffect(()=>{const timer=setTimeout(()=>setSearch(filters.search),300);return ()=>clearTimeout(timer);},[filters.search]);
  const loader=useCallback(client=>client.get('/billing/workspace?'+new URLSearchParams({month,type,search,status:filters.status,offset:filters.offset,limit:25})),[month,type,search,filters.status,filters.offset]);
  const page=useRemoteData(loader,{keepPrevious:true});
  const leaseLoader=useCallback(client=>client.get('/billing/leases?'+new URLSearchParams({month:form.period,type}),{cacheMs:10_000}),[form.period,type]);
  const leases=useRemoteData(leaseLoader,{keepPrevious:true});
  const data=useMemo(()=>page.data&&leases.data?{...page.data,leases:leases.data}:null,[page.data,leases.data]);
  const error=page.error||leases.error,loading=page.loading||leases.loading;
  const reloadWorkspace=()=>page.reload();
  const reloadAll=()=>{page.reload();leases.reload();};
  const changeMonth=value=>{setMonth(value);setFilters(f=>({...f,offset:0}));};
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const busy = useRef(false);
  const [payment, setPayment] = useState(null);
  const [correction, setCorrection] = useState(null);
  const all = type === 'rent' && form.lease === 'all';
  const availableLeases=useMemo(()=>data?.leases.filter(lease=>!lease.billed)||[],[data]);

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
      if (!response.bulk || !response.failures?.length) setForm(current => ({
        lease: '', period: current.period, due: current.due,
        rent: '', electricity: '', water: '',
      }));
      changeMonth(form.period);
      reloadAll();
    } catch (e) { setMessage(e.message); }
    finally { busy.current = false; setSaving(false); }
  };

  if (loading&&!data) return <PageSkeleton variant="billing" label="Loading billing..."/>;
  if (error&&!data) return <p role="alert" className="py-6 text-rose-700">{error} <button onClick={reloadAll} className="underline">Retry</button></p>;

  const createForm = <form onSubmit={submit} aria-busy={saving} className="rounded-2xl border border-blue-100 border-l-4 border-l-blue-500 bg-white p-4 shadow-sm sm:p-5">
    <h2 className="font-bold">Create {type} bill</h2>
    <fieldset disabled={saving} className="mt-3 grid gap-3 sm:grid-cols-3">
      <label className="text-sm">Tenant / room
        <LeasePicker leases={availableLeases} value={form.lease} disabled={saving || leases.loading || !availableLeases.length} includeAll={type === 'rent'} onChange={leaseId => {
          const lease = availableLeases.find(item => item.id === leaseId);
          setForm({ ...form, lease: leaseId, rent: lease?.rent == null ? '' : String(lease.rent) });
        }} />
      </label>
      {[['period', 'Billing month', 'month'], ['due', 'Due date', 'date'],
        ...(type === 'rent' ? (all ? [] : [['rent', 'Rent amount', 'number']])
          : [['electricity', 'Electricity', 'number'], ['water', 'Water', 'number']])
      ].map(([key, label, inputType]) => <label key={key} className="text-sm">{label}
        <input required readOnly={key==='due'} type={inputType} min={inputType === 'number' ? '0' : undefined} step={inputType === 'number' ? '0.01' : undefined} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value, ...(key==='period'?{lease:'',due:event.target.value?monthEnd(event.target.value):''}:{}) })} className={field+(key==='due'?' cursor-not-allowed bg-slate-100 text-slate-600':'')} />
      </label>)}
      {all && type === 'rent' && <label className="text-sm">Rent amount<input readOnly value="Each tenant's saved monthly rent" className={field + " text-slate-600"} /></label>}
      <button disabled={leases.loading || !availableLeases.length || !form.lease} className="self-end rounded-lg bg-blue-600 p-3 font-semibold text-white disabled:opacity-50">
        {saving ? (all ? 'Creating bills...' : 'Saving...') : all ? 'Create bills for all (' + availableLeases.length + ')' : 'Create bill'}
      </button>
    </fieldset>
    {all && <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
      <p>One rent bill per active tenant, using their saved monthly rent.</p>
      <p className="mt-1">The billing month and due date apply to everyone. Existing bills of this type for the month will be skipped.</p>
    </div>}
    {!data.leases.length && <p className="mt-3 text-sm text-slate-500">Add a tenant with an active lease first.</p>}
    {!!data.leases.length&&!availableLeases.length&&<p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Every active tenant already has a {type} bill for {form.period}.</p>}
    {saving && <div role="status" aria-live="polite" className="mt-3 text-sm text-blue-700"><progress aria-label="Saving billing changes" className="mb-1 h-1.5 w-full overflow-hidden rounded-full"/><p>Creating {all ? 'bills for all active tenants' : 'bill'}… Please keep this page open.</p></div>}
    {message && <p role="alert" className="mt-3 text-rose-700">{message}</p>}
    {result && <div role={result.failures.length ? "alert" : "status"} className={"mt-3 rounded-lg p-3 text-sm " + (result.failures.length ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-800")}>
      <p className="font-semibold">{result.message}</p>
      {result.failures.length > 0 && <><p className="mt-1">Resolve the issues below and submit All again. Bills already created will be skipped.</p><ul className="mt-2 list-disc space-y-1 pl-5">{result.failures.map(failure => <li key={failure.lease}>{failure.name} / Room {failure.room}: {failure.message}</li>)}</ul></>}
    </div>}
  </form>;

  const remind=async bill=>{await sendPaymentReminder(api,bill);reloadWorkspace();};
  return <>{error && <p role="alert" className="mb-3 text-sm text-rose-700">{error} Showing previously loaded records. <button onClick={reloadAll} className="underline">Retry</button></p>}<BillingLedger type={type} bills={data.bills} summary={data.summary} month={month} onMonthChange={changeMonth} page={data} loading={page.loading||search!==filters.search} filters={filters} onFiltersChange={setFilters} createForm={createForm} onRefresh={reloadAll} onPayment={setPayment} onReminder={remind} onCorrection={setCorrection} />
    {correction && <Suspense fallback={<DialogLoading label="Opening payment correction…"/>}><PaymentCorrectionDialog payment={correction} onClose={() => setCorrection(null)} onSaved={() => { setCorrection(null); reloadWorkspace(); }} /></Suspense>}
    {payment && <Suspense fallback={<DialogLoading label="Opening payment form…"/>}><RecordPaymentForm bill={payment} onClose={() => setPayment(null)} onSaved={() => { setPayment(null); reloadWorkspace(); }} /></Suspense>}
  </>;
}
