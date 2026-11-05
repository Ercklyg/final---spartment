import { useEffect, useRef, useState } from 'react';
import { BellRing, RefreshCw, X } from 'lucide-react';
import { api } from '../../lib/api.js';
import { money } from '../../lib/billing.js';
import { closeFromBackdrop } from '../../lib/dialog.js';

const audiences = [['all_unpaid', 'All unpaid'], ['overdue', 'Overdue only'], ['partially_paid', 'Partially paid']];
const button = 'min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';

export default function BulkReminderDialog({ month, type, onClose, onSaved }) {
  const dialog = useRef(null);
  const busy = useRef(false);
  const operation = useRef(null);
  const [audience, setAudience] = useState('overdue');
  const [revision, setRevision] = useState(0);
  const [preview, setPreview] = useState({ loading: true, data: null, error: '' });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    api.get('/billing/reminders/preview?' + new URLSearchParams({ month, type, audience }), { force: true, signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setPreview({ loading: false, data, error: '' }); })
      .catch(reason => { if (!controller.signal.aborted) setPreview({ loading: false, data: null, error: reason.message }); });
    return () => controller.abort();
  }, [month, type, audience, revision]);
  const refresh = () => {
    operation.current = null;
    setPreview({ loading: true, data: null, error: '' });
    setError('');
    setRevision(value => value + 1);
  };
  const selectAudience = value => { setAudience(value); refresh(); };
  const send = async () => {
    if (busy.current || !preview.data?.eligibleBills) return;
    busy.current = true;
    operation.current ||= crypto.randomUUID();
    setSending(true);
    setError('');
    try {
      const response = await api.post('/billing/reminders/bulk', { month, type, audience, id: operation.current }, { silent: true, timeoutMs: 60000 });
      setResult(response);
      api.invalidate();
      onSaved?.();
    } catch (reason) { setError(reason.message); }
    finally { busy.current = false; setSending(false); }
  };
  const data = preview.data;
  const period = new Date(month + '-01T12:00:00').toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  return <dialog ref={dialog} aria-labelledby="bulk-reminder-title" onCancel={event => { event.preventDefault(); if (!busy.current) onClose(); }} onMouseDown={event => closeFromBackdrop(event, onClose, sending)} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/45">
    <div className="p-5 sm:p-6">
      <div className="flex items-start gap-3"><span className="rounded-xl bg-amber-50 p-2.5 text-amber-600"><BellRing size={22}/></span><div className="min-w-0 flex-1"><h2 id="bulk-reminder-title" className="text-lg font-bold">Send payment reminders</h2><p className="mt-1 text-sm text-slate-500">{type === 'rent' ? 'Rent' : 'Utility'} bills · {period}</p></div><button type="button" aria-label="Close payment reminders" disabled={sending} onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X size={20}/></button></div>
      {!result ? <>
        <label className="mt-5 block text-sm font-semibold">Remind tenants with<select disabled={sending} value={audience} onChange={event => selectAudience(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal">{audiences.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <p className="mt-2 text-xs leading-5 text-slate-500">{audience === 'all_unpaid' ? 'Every bill with a remaining balance.' : audience === 'overdue' ? 'Unpaid bills past their due date, using the current Philippine date.' : 'Bills with a recorded payment and a remaining balance, including overdue bills.'}</p>
        <p className="mt-3 text-sm leading-6 text-slate-600">Includes all matching {type} bills for this month, across every page. The table search and status filter do not apply. Each tenant receives one combined in-app notification.</p>
        {preview.loading ? <p role="status" className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Checking recipients and reminder cooldowns…</p> : preview.error ? <p role="alert" className="mt-4 text-sm text-rose-700">{preview.error}</p> : data && <>
          <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-blue-50 p-4 text-sm"><div><dt className="text-slate-600">Tenants to notify</dt><dd className="mt-1 text-xl font-bold">{data.tenantCount}</dd></div><div><dt className="text-slate-600">Eligible bills</dt><dd className="mt-1 text-xl font-bold">{data.eligibleBills}</dd></div><div><dt className="text-slate-600">Remaining balance</dt><dd className="mt-1 font-bold">{money(data.balance)}</dd></div><div><dt className="text-slate-600">Skipped by cooldown</dt><dd className="mt-1 font-bold">{data.skippedBills}</dd></div></dl>
          {!!data.recipients?.length && <div className="mt-4"><h3 className="text-sm font-semibold">Recipient preview{data.tenantCount > 10 ? ' (first 10)' : ''}</h3><ul className="mt-2 max-h-36 divide-y divide-slate-100 overflow-y-auto text-sm">{data.recipients.map((recipient, index) => <li key={index} className="flex justify-between gap-3 py-2"><span className="min-w-0 break-words">{recipient.name} <span className="text-slate-500">· {recipient.bills} bill(s)</span></span><span className="shrink-0 font-medium">{money(recipient.balance)}</span></li>)}</ul></div>}
          {!data.eligibleBills && <p role="status" className="mt-3 text-sm text-slate-600">No eligible bills to remind. Matching bills may already be paid or within the cooldown.</p>}
          <p className="mt-3 text-xs leading-5 text-slate-500">Bills reminded in the last five minutes are skipped. Balances and eligibility are checked again when sending, so the final counts may differ from this preview.</p>
        </>}
        {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" disabled={sending} onClick={onClose} className={button}>Cancel</button><button type="button" disabled={sending || preview.loading} onClick={refresh} className={button + ' inline-flex items-center gap-2'}><RefreshCw size={15}/>Refresh preview</button><button type="button" disabled={sending || preview.loading || !data?.eligibleBills} onClick={send} className="min-h-11 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50">{sending ? 'Sending reminders…' : `Send to ${data?.tenantCount || 0} tenant(s)`}</button></div>
      </> : <>
        <h3 className="mt-5 font-semibold">Reminder delivery summary</h3>
        <p role="status" className="mt-2 text-sm leading-6 text-slate-700">Notified {result.sentTenants} tenant(s) about {result.sentBills} bill(s). Skipped {result.skippedBills} bill(s) due to cooldown. Failed: {result.failedBills} bill(s).</p>
        {result.failures?.length > 0 && <ul className="mt-3 space-y-2 text-sm text-rose-700">{result.failures.map((failure, index) => <li key={index}>{failure.name}: {failure.message}</li>)}</ul>}
        <p className="mt-3 text-xs text-slate-500">These counts confirm in-app notifications, not email or device-push delivery. To retry failed bills, close this dialog and open a new preview; successful bills remain protected by the cooldown.</p>
        <div className="mt-5 flex justify-end"><button type="button" onClick={onClose} className={button}>Done</button></div>
      </>}
    </div>
  </dialog>;
}
