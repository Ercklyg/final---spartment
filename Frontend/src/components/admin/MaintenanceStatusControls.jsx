import { useState } from "react";

export default function MaintenanceStatusControls({ request, onUpdate }) {
  const [status, setStatus] = useState(request.status);
  const [date, setDate] = useState(request.scheduledDate || "");
  const [error, setError] = useState("");
  const button = "min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium";
  return <form className="mb-5 rounded-xl border border-slate-200 p-4" onSubmit={event => {
    event.preventDefault();
    if (status === "Scheduled" && (!date || date < request.created.slice(0, 10))) { setError("Choose a visit date on or after the submitted date."); return; }
    const detail = status === "Scheduled" ? `A technician is scheduled for ${date}.` : status === "Resolved" ? `Completed ${new Date().toLocaleDateString("en-PH")}.` : status === "In progress" ? "Maintenance work is in progress." : "Awaiting review by building admin.";
    onUpdate({ status, scheduledDate: status === "Scheduled" ? date : null, detail }, `${status}: ${detail}`);
    setError("");
  }}>
    <h3 className="mb-2 font-semibold">Maintenance status</h3>
    <div className="flex flex-wrap gap-2">{["Open", "Scheduled", "In progress", "Resolved"].map(value => <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)} className={`${button} ${status === value ? "border-blue-300 bg-blue-50 text-blue-700" : "bg-white"}`}>{value}</button>)}</div>
    {status === "Scheduled" && <label className="mt-3 block">Scheduled visit date<input type="date" required min={request.created.slice(0, 10)} value={date} onChange={event => setDate(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 p-2"/></label>}
    {error && <p role="alert" className="mt-2 text-rose-700">{error}</p>}
    <button type="submit" disabled={status === request.status && (status !== "Scheduled" || date === request.scheduledDate)} className={`${button} mt-3 bg-blue-600 text-white disabled:opacity-50`}>Save status</button>
  </form>;
}
