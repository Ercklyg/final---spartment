import { useEffect, useRef, useState } from "react";

import { maintenanceRequests } from "../tenant/maintenanceRequests.js";

import MaintenanceStatusControls from "./MaintenanceStatusControls.jsx";
import { useRequestUpdates, updateRequest } from "../tenant/requestUpdates.js";

const seed = [
["Inquiry","Available room on Floor 2","Is room 202 available for July move-in?","Anna Reyes","anna@example.com","","","Guest"],
["Maintenance","Leaking faucet","Bathroom sink has been leaking for two days.","Carlos Reyes","carlos@example.com","0917 123 4567","109","Tenant"],
["Other","Visitor policy","Are overnight guests allowed on weekdays?","Mark Cruz","mark@example.com","0917 555 7890","","Tenant"],
["Maintenance","AC not cooling","Aircon stops cooling after about 30 minutes of use.","Sophia Chen","sophia@example.com","0918 987 6543","207","Tenant"],
["Inquiry","Parking space","Is there an available parking slot for an additional vehicle?","Nina Ramos","nina@example.com","0917 222 3344","","Guest"]
];
const field = "w-full rounded-lg border border-slate-300 bg-white p-2.5 text-base";
const button = "min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-[15px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";
const tones = { Scheduled: "bg-amber-50 text-amber-800", Open: "bg-blue-50 text-blue-700", "In progress": "bg-amber-50 text-amber-800", Resolved: "bg-emerald-50 text-emerald-700" };
const typeColors = { All: "border-slate-300 bg-slate-100 text-slate-800", Inquiry: "border-blue-200 bg-blue-50 text-blue-700", Maintenance: "border-amber-200 bg-amber-50 text-amber-800", Other: "border-violet-200 bg-violet-50 text-violet-700" };
const priorities = { Normal: "bg-slate-100 text-slate-700", High: "bg-orange-50 text-orange-800", Urgent: "bg-rose-50 text-rose-700" };
const formatDate = value => new Date(value).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });

function RequestDialog({ request, onClose, onUpdate }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.showModal();
    return () => previous?.focus();
  }, []);
  return <dialog ref={ref} onCancel={onClose} aria-labelledby="request-title" className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl bg-white p-5 text-base text-slate-900 shadow-xl backdrop:bg-slate-950/40">
    <div className="flex items-start justify-between gap-3"><div><p className="text-sm text-slate-600">{request.id} · {request.type}</p><h2 id="request-title" className="text-xl font-bold">{request.title}</h2></div><button className={button} onClick={onClose}>Close</button></div>
    <p className="mt-4 whitespace-pre-wrap break-words">{request.text}</p>{request.detail && <p className="mt-2 text-slate-700">{request.detail}</p>}
    <dl className="my-4 grid gap-2 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
      <div><dt className="text-sm text-slate-600">Sender</dt><dd>{request.name} ({request.sender})</dd></div>
      <div><dt className="text-sm text-slate-600">Room</dt><dd>{request.room || "Not provided"}</dd></div>
      <div className="min-w-0"><dt className="text-sm text-slate-600">Email</dt><dd className="break-all">{request.email ? <a className="text-blue-700 underline" href={`mailto:${request.email}`}>{request.email}</a> : "Not provided"}</dd></div>
      <div><dt className="text-sm text-slate-600">Phone</dt><dd>{request.phone ? <a className="text-blue-700 underline" href={`tel:${request.phone.replaceAll(" ", "")}`}>{request.phone}</a> : "Not provided"}</dd></div>
      <div><dt className="text-sm text-slate-600">Submitted</dt><dd>{formatDate(request.created)}</dd></div>
      <div><dt className="text-sm text-slate-600">Current status</dt><dd aria-live="polite" className="mt-1"><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${tones[request.status]}`}><span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />{request.status}</span></dd></div>
    </dl>
    {request.type === "Maintenance" && <div className="mb-4"><h3 className="mb-2 font-semibold">Maintenance priority</h3><span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${priorities[request.priority]}`}>{request.priority}</span></div>}
    {request.type === "Maintenance" && <MaintenanceStatusControls request={request} onUpdate={onUpdate} />}
    <h3 className="font-bold">Request history</h3><ol className="mt-3 space-y-3">{[...request.history].reverse().map((entry, index) => <li key={index} className="border-l-2 border-slate-200 pl-3"><p className="whitespace-pre-wrap break-words">{entry.text}</p><p className="text-sm text-slate-600">{formatDate(entry.date)}</p></li>)}</ol>
  </dialog>;
}

export default function RequestsWorkspace() {
  const [initialRequests] = useState(() => [...maintenanceRequests, ...seed.map(([type,title,text,name,email,phone,room,sender],index)=>{
    const created = `2026-05-0${index+2}T10:24:00+08:00`;
    return {id:`REQ-${String(index+1).padStart(3,"0")}`,type,title,text,name,email,phone,room,sender,created,status:"Open",priority:"Normal",history:[{date:created,text:"Request submitted."}]};
  })]);
  const updates = useRequestUpdates();
  const requests = initialRequests.map(request=>updates[request.id]||request);
  const [type, setType] = useState("All");
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(null);
  const [notice, setNotice] = useState("");
  const shown = requests.filter(r => (type === "All" || r.type === type) && (status === "All" || r.status === status) && (priority === "All" || (r.type === "Maintenance" && r.priority === priority)) && `${r.id} ${r.name} ${r.room} ${r.title} ${r.text}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => b.created.localeCompare(a.created));
  const selected = requests.find(r => r.id === active);
  return <>
    <header className="pt-7"><h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Customer Requests</h1><p className="mt-2 text-base text-slate-600">Guest inquiries, tenant maintenance, and general messages.</p></header>
    <section aria-label="Request filters" className="mt-5 space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap gap-2">{["All", "Inquiry", "Maintenance", "Other"].map(value => <button key={value} aria-pressed={type === value} onClick={() => setType(value)} className={`${button} ${type === value ? `${typeColors[value]} ring-2 ring-current` : typeColors[value]}`}>{value} ({requests.filter(r => value === "All" || r.type === value).length})</button>)}</div>
      <div className="grid gap-3 md:grid-cols-3"><label className="block">Search<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, room, or keyword" className={`${field} mt-1`}/></label>
        <label>Status<select className={`${field} mt-1`} value={status} onChange={e => setStatus(e.target.value)}>{["All", "Open", "Scheduled", "In progress", "Resolved"].map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Maintenance priority<select className={`${field} mt-1`} value={priority} onChange={e => setPriority(e.target.value)}>{["All", "Normal", "High", "Urgent"].map(value => <option key={value}>{value}</option>)}</select></label></div>
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-slate-600">{shown.length} of {requests.length} requests · Newest first</p><button className={button} onClick={() => { setQuery(""); setType("All"); setStatus("All"); setPriority("All"); }}>Clear filters</button></div>
    </section>
    {notice && <p role="status" className="mt-3 text-emerald-700">{notice}</p>}
    <section aria-label="Requests" className="mt-4 space-y-4">{shown.map(request => <article key={request.id} className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-medium text-slate-600">{request.id}</span><span className={`rounded-full border px-3 py-1 font-medium ${typeColors[request.type]}`}>{request.type}</span><span className={`rounded-full px-3 py-1 font-medium ${tones[request.status]}`}>{request.status}</span>{request.type === "Maintenance" && <span className={`rounded-full px-3 py-1 font-medium ${priorities[request.priority]}`}>{request.priority} priority</span>}</div>
      <h2 className="mt-3 text-lg font-bold">{request.title}</h2><p className="mt-1 break-words text-base text-slate-700">{request.text}</p>
      {request.detail && <p className="mt-2 text-slate-700">{request.detail}</p>}
      <p className="mt-3 text-[15px] text-slate-600">{request.name} · {request.sender}{request.room && ` · Room ${request.room}`}</p><p className="text-sm text-slate-600">Submitted {formatDate(request.created)}</p>
      <div className="mt-4 flex flex-wrap gap-2"><button className={button} onClick={() => setActive(request.id)}>View information</button><button className={`${button} bg-blue-600 text-white`} onClick={() => setActive(request.id)}>{request.status === "Resolved" ? "Reopen" : "Update / Resolve"}</button></div>
    </article>)}{!shown.length && <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">No requests match your search or filters.</p>}</section>
    {selected && <RequestDialog key={selected.id} request={selected} onClose={() => setActive(null)} onUpdate={(changes, text) => { updateRequest(selected, changes, text); setNotice(`${selected.id} updated.`); }}/>} 
  </>;
}
