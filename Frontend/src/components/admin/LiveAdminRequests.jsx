import { Building2, Eye, MessageSquareText, RefreshCw, Wrench } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import PageSkeleton from "../PageSkeleton.jsx";
import PageControls from "../PageControls.jsx";
import { useRemoteData } from "../../lib/useRemoteData.js";
import { useSessionState } from "../../lib/useSessionState.js";

const RequestInformation = lazy(() => import("./RequestInformation.jsx"));
const DialogLoading = ({ label }) => <div role="status" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4"><p className="rounded-xl bg-white px-5 py-4 text-sm font-medium text-slate-700">{label}</p></div>;
const REQUESTS_PER_PAGE = 20;
const loadWorkspace = (client,filter,offset) => client.get(`/requests/workspace?${new URLSearchParams({filter,offset,limit:REQUESTS_PER_PAGE})}`);
const statusTone = {
  New: "bg-blue-50 text-blue-700 ring-blue-100",
  Scheduled: "bg-violet-50 text-violet-700 ring-violet-100",
  "In progress": "bg-amber-50 text-amber-700 ring-amber-100",
  Contacted: "bg-cyan-50 text-cyan-700 ring-cyan-100",
  Resolved: "bg-emerald-50 text-emerald-700 ring-emerald-100",
};
const priorityAccent = { urgent: "border-l-rose-500", high: "border-l-amber-500", normal: "border-l-blue-500" };

function RequestCard({ request, inquiry, onView }) {
  const title = inquiry ? "Room inquiry" : request.subject;
  const person = inquiry ? request.full_name : request.profiles?.full_name;
  const location = inquiry
    ? request.preferred_room || "Any available room"
    : request.rooms?.room_number ? `Room ${request.rooms.room_number}` : "Unassigned room";
  const Icon = inquiry ? Building2 : request.kind === "maintenance" ? Wrench : MessageSquareText;
  const accent = inquiry ? "border-l-violet-500" : priorityAccent[String(request.priority || "normal").toLowerCase()] || "border-l-blue-500";

  return <article className={`rounded-2xl border border-l-4 border-slate-200 bg-white p-4 shadow-[0_4px_14px_rgba(15,23,42,0.035)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:flex sm:items-center sm:justify-between sm:gap-5 ${accent}`}>
    <div className="flex min-w-0 flex-1 items-start gap-3">
      <span className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex ${inquiry?"bg-violet-50 text-violet-600":request.kind==="maintenance"?"bg-amber-50 text-amber-600":"bg-blue-50 text-blue-600"}`}><Icon size={19}/></span>
      <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-600">{inquiry ? "Inquiry" : request.kind}</span>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusTone[request.status]||statusTone.New}`}>{request.status === "Resolved" ? "Resolved · Done" : request.status}</span>
      </div>
      <h2 className="mt-2 break-words text-base font-bold leading-snug text-slate-900 sm:text-lg">{title}</h2>
      <p className="mt-1 break-words text-sm font-medium text-slate-700">{person || "Tenant"}</p>
      <div className="mt-2 grid grid-cols-2 gap-3 border-t border-slate-100 pt-2 text-xs sm:flex sm:flex-wrap sm:gap-x-5">
        <div><p className="text-slate-600">{inquiry ? "Preferred room" : "Location"}</p><p className="mt-0.5 font-medium text-slate-600">{location}</p></div>
        {!inquiry && <div><p className="text-slate-600">Priority</p><p className="mt-0.5 font-medium capitalize text-slate-600">{request.priority}</p></div>}
        <div className={inquiry ? "" : "col-span-2 sm:col-span-1"}><p className="text-slate-600">Submitted</p><p className="mt-0.5 font-medium text-slate-600">{new Date(request.created_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</p></div>
      </div>
      </div>
    </div>
    <button type="button" onClick={onView} className="mt-4 flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 sm:mt-0 sm:w-auto"><Eye size={17}/>View information</button>
  </article>;
}

export default function LiveAdminRequests() {
  const [filter, setFilter] = useSessionState("admin-requests-filter", "All");
  const [offset,setOffset] = useSessionState("admin-requests-offset-20",0);
  const loader=useCallback(client=>loadWorkspace(client,filter,offset),[filter,offset]);
  const { data, error, loading, reload } = useRemoteData(loader, { keepPrevious: true });
  const reloadRef=useRef(reload);
  useEffect(()=>{reloadRef.current=reload;},[reload]);
  useEffect(()=>{const refresh=()=>{if(document.visibilityState==='visible'&&navigator.onLine)reloadRef.current({silent:true});};const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);window.addEventListener('online',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);};},[]);
  const [selected, setSelected] = useState(null);
  const requests = data?.requests || [];
  const inquiries = data?.inquiries || [];
  const total = data?.total ?? 0;
  const currentSelection=selected?{...selected,request:(selected.inquiry?inquiries:requests).find(item=>item.id===selected.request.id)||selected.request}:null;

  return <section className="space-y-4 py-6 sm:py-8">
    <div><div className="flex items-center gap-2"><h1 className="text-[28px] font-extrabold leading-tight tracking-tight sm:text-3xl">Customer requests</h1>{data && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{total}</span>}</div><p className="mt-1 text-sm text-slate-600 sm:text-base">Review tenant requests and room inquiries.</p></div>
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">{["All", "Maintenance", "Other", "Inquiry"].map(value => <button key={value} type="button" onClick={() => {setFilter(value);setOffset(0);}} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition ${filter === value ? "border-blue-600 bg-blue-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"}`}>{value}</button>)}<button type="button" disabled={loading} onClick={reload} className="col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 disabled:opacity-50 sm:ml-auto"><RefreshCw size={16} className={loading ? "animate-spin" : ""}/>{loading ? "Refreshing..." : "Refresh"}</button></div>
    {loading && !data ? <PageSkeleton variant="list" label="Loading requests..." /> : error && !data ? <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : <div className="space-y-3" aria-busy={loading}>
      {loading && <div role="status" aria-live="polite" className="overflow-hidden rounded-full bg-blue-100"><div className="h-1.5 w-full animate-pulse bg-blue-500"/><span className="sr-only">Updating requests</span></div>}{error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {requests.map(request => <RequestCard key={`request-${request.id}`} request={request} onView={() => setSelected({ request, inquiry: false })} />)}
      {inquiries.map(request => <RequestCard key={`inquiry-${request.id}`} request={request} inquiry onView={() => setSelected({ request, inquiry: true })} />)}
      {!requests.length && !inquiries.length && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No matching requests.</p>}
      <PageControls disabled={loading} offset={offset} limit={REQUESTS_PER_PAGE} total={total} onChange={setOffset}/>
    </div>}
    {currentSelection && <Suspense fallback={<DialogLoading label="Opening request information…"/>}><RequestInformation key={currentSelection.request.id} request={currentSelection.request} inquiry={currentSelection.inquiry} onClose={() => setSelected(null)} onSaved={reload} /></Suspense>}
  </section>;
}
