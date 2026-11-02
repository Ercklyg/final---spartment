import { useRef, useState } from "react";
import { X } from "lucide-react";
import { api } from "../../lib/api.js";
import MaintenanceAttachments from "../requests/MaintenanceAttachments.jsx";

const inquiryStatuses = ["New", "Contacted", "Resolved"];
const requestStatuses = ["New", "Scheduled", "In progress", "Resolved"];

export default function RequestInformation({ request, inquiry, onClose, onSaved }) {
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
        <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{inquiry ? "Room inquiry" : "Customer request"}</p><h2 id="request-information-title" className="mt-1 break-words text-xl font-bold leading-tight">{inquiry ? "Room inquiry" : request.subject}</h2><p className="mt-1 break-words text-sm text-slate-600">{inquiry ? request.full_name : request.profiles?.full_name} · {new Date(request.created_at).toLocaleString("en-PH")}</p></div>
        <button type="button" disabled={saving} onClick={onClose} aria-label="Close request information" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"><X size={19}/></button>
      </div>
      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-sm">
        <div className="border-b border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">{inquiry?"Contact and preference":"Request information"}</div>
        <div className="space-y-3 p-4">
        {inquiry ? <>
          <p className="break-words"><strong>Email:</strong> {request.email}</p><p className="break-words"><strong>Contact number:</strong> {request.phone || "Not provided"}</p><p><strong>Preferred room:</strong> {request.preferred_room || "Any available room"}</p><p><strong>Preferred move-in date:</strong> {request.move_in_date || "Not specified"}</p>
        </> : <>
          <div className="grid grid-cols-2 gap-3"><p><strong className="block text-xs text-slate-600">Type</strong><span className="capitalize">{request.kind}</span></p><p><strong className="block text-xs text-slate-600">Priority</strong><span className="capitalize">{request.priority}</span></p></div><p><strong className="block text-xs text-slate-600">Room</strong>{request.rooms?.buildings?.name ? `${request.rooms.buildings.name} / ` : ""}{request.rooms?.room_number || "Unassigned"}</p>
        </>}
        </div>
        <div className="border-t border-slate-200 bg-white p-4"><strong className="text-xs font-semibold uppercase tracking-wide text-slate-600">Message</strong><p className="mt-1 whitespace-pre-wrap break-words leading-6 text-slate-700">{request.message || "No message provided."}</p></div>
      </div>
      {!inquiry && request.kind === "maintenance" && <MaintenanceAttachments requestId={request.id} attachments={request.maintenance_attachments}/>}
      <form onSubmit={save} className="mt-5 border-t border-slate-100 pt-5"><fieldset disabled={saving} className="space-y-4">
        <label className="block text-sm font-medium">Status <span className="font-normal text-slate-600">· Resolved means done</span><select value={status} onChange={event => setStatus(event.target.value)} className="mt-1.5 block h-11 w-full rounded-xl border border-slate-200 bg-white px-3">{(inquiry ? inquiryStatuses : requestStatuses).map(value => <option key={value} value={value}>{value === "Resolved" ? "Resolved (Done)" : value}</option>)}</select></label>
        {!inquiry && <label className="block text-sm font-medium">Update visible to tenant<textarea maxLength={4000} value={note} onChange={event => setNote(event.target.value)} className="mt-1.5 min-h-24 w-full rounded-xl border border-slate-200 p-3" /></label>}
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end"><button type="button" disabled={saving} onClick={onClose} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button><button type="submit" className="min-h-11 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save update"}</button></div>
      </fieldset></form>
    </section>
  </div>;
}
