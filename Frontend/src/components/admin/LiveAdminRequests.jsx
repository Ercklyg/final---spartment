import { Eye, RefreshCw, X } from "lucide-react";
import { useRef, useState } from "react";
import PageSkeleton from "../PageSkeleton.jsx";
import { api } from "../../lib/api.js";
import { useRemoteData } from "../../lib/useRemoteData.js";
import { useSessionState } from "../../lib/useSessionState.js";

const loadWorkspace = client => client.get("/requests/workspace");
const inquiryStatuses = ["New", "Contacted", "Resolved"];
const requestStatuses = ["New", "Scheduled", "In progress", "Resolved"];

function RequestCard({ request, inquiry, onView }) {
  const title = inquiry ? "Room inquiry" : request.subject;
  const person = inquiry ? request.full_name : request.profiles?.full_name;
  const location = inquiry
    ? request.preferred_room || "Any available room"
    : request.rooms?.room_number ? `Room ${request.rooms.room_number}` : "Unassigned room";

  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-5">
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-600">{inquiry ? "Inquiry" : request.kind}</span>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${request.status === "Resolved" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{request.status === "Resolved" ? "Resolved · Done" : request.status}</span>
      </div>
      <h2 className="mt-3 break-words text-base font-bold leading-snug text-slate-900 sm:text-lg">{title}</h2>
      <p className="mt-1 break-words text-sm font-medium text-slate-700">{person || "Tenant"}</p>
      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs sm:flex sm:flex-wrap sm:gap-x-5">
        <div><p className="text-slate-400">{inquiry ? "Preferred room" : "Location"}</p><p className="mt-0.5 font-medium text-slate-600">{location}</p></div>
        {!inquiry && <div><p className="text-slate-400">Priority</p><p className="mt-0.5 font-medium capitalize text-slate-600">{request.priority}</p></div>}
        <div className={inquiry ? "" : "col-span-2 sm:col-span-1"}><p className="text-slate-400">Submitted</p><p className="mt-0.5 font-medium text-slate-600">{new Date(request.created_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</p></div>
      </div>
    </div>
    <button type="button" onClick={onView} className="mt-4 flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 sm:mt-0 sm:w-auto"><Eye size={17}/>View information</button>
  </article>;
}

function RequestInformation({ request, inquiry, onClose, onSaved }) {
  const [status, setStatus] = useState(request.status);
  const [note, setNote] = useState(request.admin_note || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  const save = async event => {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      await api.patch(`/${inquiry ? "inquiries" : "requests"}/${request.id}`, inquiry ? { status } : { status, admin_note: note.trim() });
      await onSaved();
      onClose();
    } catch (e) {
      setError(e.message || "Unable to save the update.");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-3 sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget && !saving) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="request-information-title" className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:max-h-[90dvh] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{inquiry ? "Room inquiry" : "Customer request"}</p><h2 id="request-information-title" className="mt-1 break-words text-xl font-bold leading-tight">{inquiry ? "Room inquiry" : request.subject}</h2><p className="mt-1 break-words text-sm text-slate-500">{inquiry ? request.full_name : request.profiles?.full_name} · {new Date(request.created_at).toLocaleString("en-PH")}</p></div>
        <button type="button" disabled={saving} onClick={onClose} aria-label="Close request information" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100"><X size={19}/></button>
      </div>
      <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
        {inquiry ? <>
          <p className="break-words"><strong>Email:</strong> {request.email}</p><p className="break-words"><strong>Contact number:</strong> {request.phone || "Not provided"}</p><p><strong>Preferred room:</strong> {request.preferred_room || "Any available room"}</p><p><strong>Preferred move-in date:</strong> {request.move_in_date || "Not specified"}</p>
        </> : <>
          <div className="grid grid-cols-2 gap-3"><p><strong className="block text-xs text-slate-500">Type</strong><span className="capitalize">{request.kind}</span></p><p><strong className="block text-xs text-slate-500">Priority</strong><span className="capitalize">{request.priority}</span></p></div><p><strong className="block text-xs text-slate-500">Room</strong>{request.rooms?.buildings?.name ? `${request.rooms.buildings.name} / ` : ""}{request.rooms?.room_number || "Unassigned"}</p>
        </>}
        <div className="border-t border-slate-200 pt-3"><strong className="text-xs text-slate-500">Message</strong><p className="mt-1 whitespace-pre-wrap break-words leading-6 text-slate-700">{request.message || "No message provided."}</p></div>
      </div>
      <form onSubmit={save} className="mt-5 border-t border-slate-100 pt-5"><fieldset disabled={saving} className="space-y-4">
        <label className="block text-sm font-medium">Status <span className="font-normal text-slate-500">· Resolved means done</span><select value={status} onChange={event => setStatus(event.target.value)} className="mt-1.5 block h-11 w-full rounded-xl border border-slate-200 bg-white px-3">{(inquiry ? inquiryStatuses : requestStatuses).map(value => <option key={value} value={value}>{value === "Resolved" ? "Resolved (Done)" : value}</option>)}</select></label>
        {!inquiry && <label className="block text-sm font-medium">Update visible to tenant<textarea maxLength={4000} value={note} onChange={event => setNote(event.target.value)} className="mt-1.5 min-h-24 w-full rounded-xl border border-slate-200 p-3" /></label>}
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end"><button type="button" disabled={saving} onClick={onClose} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button><button type="submit" className="min-h-11 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save update"}</button></div>
      </fieldset></form>
    </section>
  </div>;
}

export default function LiveAdminRequests() {
  const { data, error, loading, reload } = useRemoteData(loadWorkspace, { keepPrevious: true });
  const [filter, setFilter] = useSessionState("admin-requests-filter", "All");
  const [selected, setSelected] = useState(null);
  const requests = data?.requests || [];
  const inquiries = data?.inquiries || [];
  const shownRequests = requests.filter(request => filter === "All" || request.kind === filter.toLowerCase());
  const shownInquiries = filter === "All" || filter === "Inquiry" ? inquiries : [];
  const total = requests.length + inquiries.length;

  return <section className="space-y-4 py-6 sm:py-8">
    <div><div className="flex items-center gap-2"><h1 className="text-[28px] font-extrabold leading-tight tracking-tight sm:text-3xl">Customer requests</h1>{data && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{total}</span>}</div><p className="mt-1 text-sm text-slate-500 sm:text-base">Review tenant requests and room inquiries.</p></div>
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">{["All", "Maintenance", "Other", "Inquiry"].map(value => <button key={value} type="button" onClick={() => setFilter(value)} className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition ${filter === value ? "border-blue-600 bg-blue-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"}`}>{value}</button>)}<button type="button" disabled={loading} onClick={reload} className="col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 disabled:opacity-50 sm:ml-auto"><RefreshCw size={16} className={loading ? "animate-spin" : ""}/>{loading ? "Refreshing..." : "Refresh"}</button></div>
    {loading && !data ? <PageSkeleton variant="list" label="Loading requests..." /> : error && !data ? <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : <div className="space-y-3" aria-busy={loading}>
      {loading && <p role="status" className="text-sm text-blue-700">Updating requests…</p>}{error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {shownRequests.map(request => <RequestCard key={`request-${request.id}`} request={request} onView={() => setSelected({ request, inquiry: false })} />)}
      {shownInquiries.map(request => <RequestCard key={`inquiry-${request.id}`} request={request} inquiry onView={() => setSelected({ request, inquiry: true })} />)}
      {!shownRequests.length && !shownInquiries.length && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No matching requests.</p>}
    </div>}
    {selected && <RequestInformation key={selected.request.id} request={selected.request} inquiry={selected.inquiry} onClose={() => setSelected(null)} onSaved={reload} />}
  </section>;
}
