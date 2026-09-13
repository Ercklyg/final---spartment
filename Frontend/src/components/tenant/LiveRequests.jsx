import PageSkeleton from "../PageSkeleton.jsx";
import { loadRequests } from '../../lib/requests.js';
import { useRemoteData } from '../../lib/useRemoteData.js';
export default function LiveRequests() {
  const {data,error,loading,reload}=useRemoteData(loadRequests);
  return <section className="rounded-xl border bg-white p-5"><div className="flex justify-between"><h2 className="font-bold">My requests</h2><button className="text-blue-600 underline" onClick={reload}>Refresh</button></div>{loading?<PageSkeleton variant="list" label="Loading requests..."/>:error?<p role="alert" className="mt-3 text-rose-700">{error}</p>:!data.length?<p className="mt-3 text-sm text-slate-500">No requests submitted yet.</p>:data.map(r=><article key={r.id} className="mt-3 border-t pt-3"><div className="flex justify-between gap-2"><h3 className="font-semibold">{r.subject}</h3><span className="text-sm text-blue-700">{r.status}</span></div><p className="whitespace-pre-wrap text-sm text-slate-600">{r.message}</p><p className="mt-1 text-xs text-slate-500">{r.priority} · {new Date(r.created_at).toLocaleString('en-PH')}</p>{r.admin_note&&<p className="mt-2 whitespace-pre-wrap rounded-lg bg-blue-50 p-3 text-sm">Admin update: {r.admin_note}</p>}</article>)}</section>;
}
