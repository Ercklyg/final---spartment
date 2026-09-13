import PageSkeleton from "../PageSkeleton.jsx";
import { CheckCircle2, Clock3 } from "lucide-react";
import { loadRequests } from "../../lib/requests.js";
import { useRemoteData } from "../../lib/useRemoteData.js";

export default function MaintenanceRequestStatus({ onOpenChat }) {
  const { data, loading, error, reload } = useRemoteData(loadRequests);
  return <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)] sm:p-5">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-slate-900">Maintenance requests</h2><p className="mt-0.5 text-xs text-slate-500">Track updates from the building admin.</p></div><button type="button" onClick={onOpenChat} className="shrink-0 text-xs font-semibold text-blue-600 hover:underline">New request</button></div>
    <div className="mt-3 divide-y divide-slate-100">
      {loading ? <PageSkeleton variant="list" label="Loading requests..."/> : error ? <p role="alert" className="text-xs text-rose-700">{error} <button onClick={reload} className="underline">Retry</button></p> : !data.length ? <p className="text-xs text-slate-500">No requests submitted yet.</p> : data.map(request => {
        const Icon = request.status === "Resolved" ? CheckCircle2 : Clock3;
        const style = request.status === "Resolved" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-700";
        return <article key={request.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
          <span className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg " + style}><Icon size={17} /></span>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-800">{request.subject}</p><span className={"shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold " + style}>{request.status}</span></div>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-500">{request.message}</p>
            <p className="mt-1 text-[11px] text-slate-400">{request.kind === "maintenance" ? "Maintenance" : "Other request"} · Submitted {new Date(request.created_at).toLocaleDateString("en-PH")}</p>
            {request.admin_note && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">Admin update: {request.admin_note}</p>}
          </div>
        </article>;
      })}
    </div>
  </section>;
}
