import PageSkeleton from "../PageSkeleton.jsx";
import { useRef, useState } from "react";
import { api } from "../../lib/api.js";
import { useRemoteData } from "../../lib/useRemoteData.js";

const loadWorkspace = client => client.get("/requests/workspace");
const inquiryStatuses = ["New", "Contacted", "Resolved"];
const requestStatuses = ["New", "Scheduled", "In progress", "Resolved"];

function RequestCard({ request, inquiry, onView, onSaved }) {
  const title = inquiry ? "Room inquiry" : request.subject;
  const person = inquiry ? request.full_name : request.profiles?.full_name;
  return <article className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{title}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${request.status === "Resolved" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{request.status === "Resolved" ? "Resolved · Done" : request.status}</span></div>
      <p className="mt-1 text-sm text-slate-500">{person || "Tenant"} · {new Date(request.created_at).toLocaleString("en-PH")}</p>
      {!inquiry && <p className="mt-1 text-sm text-slate-600">{request.kind} · {request.priority}</p>}
    </div>
    <button type="button" onClick={onView} className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">View information</button>
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
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={event => { if (event.target === event.currentTarget && !saving) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="request-information-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4"><div><h2 id="request-information-title" className="text-xl font-bold">{inquiry ? "Room inquiry" : request.subject}</h2><p className="mt-1 text-sm text-slate-500">{inquiry ? request.full_name : request.profiles?.full_name} · {new Date(request.created_at).toLocaleString("en-PH")}</p></div><button type="button" disabled={saving} onClick={onClose} aria-label="Close request information" className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100">Close</button></div>
      <div className="mt-5 space-y-3 text-sm">
        {inquiry ? <>
          <p><strong>Email:</strong> {request.email}</p><p><strong>Contact number:</strong> {request.phone || "Not provided"}</p><p><strong>Preferred room:</strong> {request.preferred_room || "Any available room"}</p><p><strong>Preferred move-in date:</strong> {request.move_in_date || "Not specified"}</p>
        </> : <>
          <p><strong>Type:</strong> {request.kind}</p><p><strong>Priority:</strong> {request.priority}</p><p><strong>Room:</strong> {request.rooms?.buildings?.name ? `${request.rooms.buildings.name} / ` : ""}{request.rooms?.room_number || "Unassigned"}</p>
        </>}
        <div><strong>Message:</strong><p className="mt-1 whitespace-pre-wrap text-slate-700">{request.message || "No message provided."}</p></div>
      </div>
      <form onSubmit={save} className="mt-5 border-t border-slate-100 pt-5"><fieldset disabled={saving} className="space-y-4">
        <label className="block text-sm font-medium">Status <span className="font-normal text-slate-500">· Resolved means done</span><select value={status} onChange={event => setStatus(event.target.value)} className="mt-1.5 block h-11 w-full rounded-xl border border-slate-200 bg-white px-3">{(inquiry ? inquiryStatuses : requestStatuses).map(value => <option key={value} value={value}>{value === "Resolved" ? "Resolved (Done)" : value}</option>)}</select></label>
        {!inquiry && <label className="block text-sm font-medium">Update visible to tenant<textarea maxLength={4000} value={note} onChange={event => setNote(event.target.value)} className="mt-1.5 min-h-24 w-full rounded-xl border border-slate-200 p-3" /></label>}
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <div className="flex justify-end gap-3"><button type="button" disabled={saving} onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button><button className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save update"}</button></div>
      </fieldset></form>
    </section>
  </div>;
}

export default function LiveAdminRequests() {
  const { data, error, loading, reload } = useRemoteData(loadWorkspace);
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const requests = data?.requests || [];
  const inquiries = data?.inquiries || [];
  const shownRequests = requests.filter(request => filter === "All" || request.kind === filter.toLowerCase());
  const shownInquiries = filter === "All" || filter === "Inquiry" ? inquiries : [];
  return <section className="space-y-4 py-8"><h1 className="text-3xl font-bold">Customer requests</h1>
    <div className="flex flex-wrap gap-2">{["All", "Maintenance", "Other", "Inquiry"].map(value => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-lg border px-3 py-2 ${filter === value ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"}`}>{value}</button>)}<button type="button" onClick={reload} className="ml-auto underline">Refresh</button></div>
    {loading ? <PageSkeleton variant="list" label="Loading requests..." /> : error ? <p role="alert" className="text-rose-700">{error}</p> : <div className="space-y-3">
      {shownRequests.map(request => <RequestCard key={`request-${request.id}`} request={request} onSaved={reload} onView={() => setSelected({ request, inquiry: false })} />)}
      {shownInquiries.map(request => <RequestCard key={`inquiry-${request.id}`} request={request} inquiry onSaved={reload} onView={() => setSelected({ request, inquiry: true })} />)}
      {!shownRequests.length && !shownInquiries.length && <p className="text-slate-500">No matching requests.</p>}
    </div>}
    {selected && <RequestInformation key={selected.request.id} request={selected.request} inquiry={selected.inquiry} onClose={() => setSelected(null)} onSaved={reload} />}
  </section>;
}
