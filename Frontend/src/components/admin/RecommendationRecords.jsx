import { useCallback, useEffect, useRef } from 'react';
import { X, RefreshCw, ArrowRight } from 'lucide-react';
import { useRemoteData } from '../../lib/useRemoteData.js';
import { money } from '../../lib/billing.js';
import { formatInsightDate } from '../../lib/aiRecommendations.js';
import { closeFromBackdrop } from '../../lib/dialog.js';

export default function RecommendationRecords({ item, month, onClose, onNavigate }) {
  const dialog = useRef(null);
  const loader = useCallback(client => client.get('/analytics/recommendations/records?' + new URLSearchParams({ factId: item.factId, month }), { force: true }), [item.factId, month]);
  const { data, loading, error, reload } = useRemoteData(loader);
  useEffect(() => {
    const element = dialog.current;
    if (!element.open) element.showModal();
    return () => element.close();
  }, []);
  const title = item.actionLabel || 'Review supporting records';
  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); onClose(); }} onMouseDown={event => closeFromBackdrop(event, onClose)} aria-labelledby="recommendation-records-heading" className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl backdrop:bg-slate-950/40 sm:p-6">
    <div className="flex items-start justify-between gap-3"><div><h2 id="recommendation-records-heading" className="text-lg font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-600">{item.subject}{item.room ? ` · ${item.room}` : ''}</p></div><button autoFocus type="button" onClick={onClose} aria-label="Close supporting records" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><X size={20}/></button></div>
    {loading && <p role="status" className="py-6 text-sm text-slate-500">Checking supporting records...</p>}
    {error && <p role="alert" className="mt-4 text-sm text-rose-700">{error} <button type="button" onClick={reload} className="underline">Retry</button></p>}
    {data && <>
      <p className="mt-3 text-xs leading-5 text-slate-500">Records checked {formatInsightDate(data.checkedAt)}{item.page === 'Billing' && data.financialCutoff ? ` · Financial records through ${data.financialCutoff}` : ''}</p>
      {!data.fact || !data.records.length ? <p className="my-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No matching records remain. The situation may have changed since these actions were selected.</p> : <div className="mt-4 space-y-3">{data.records.map(record => <article key={record.id} className="min-w-0 rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h3 className="break-words text-sm font-semibold text-slate-900">{record.title}</h3><p className="mt-1 break-words text-xs text-slate-500">{record.subtitle}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{record.status}</span></div>
        {record.amount != null && <p className="mt-3 text-sm text-slate-600">{record.amountLabel}: <strong className="text-slate-900">{money(record.amount)}</strong></p>}
        {record.total != null && <dl className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">{[['Billed', record.total], ['Paid', record.paid], ['Balance', record.balance]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="mt-1 break-words font-medium text-slate-900">{money(value)}</dd></div>)}</dl>}
        {record.dueDate && <p className="mt-2 text-xs text-slate-500">Due {record.dueDate}</p>}
        {record.createdAt && <p className="mt-2 text-xs leading-5 text-slate-500">Received {formatInsightDate(record.createdAt)}</p>}
      </article>)}</div>}
    </>}
    <div className="mt-5 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-4"><button type="button" disabled={loading} onClick={reload} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"><RefreshCw size={15}/>Refresh records</button><button type="button" onClick={() => { onClose(); onNavigate?.(item.page); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Open {item.page}<ArrowRight size={15}/></button></div>
  </dialog>;
}
