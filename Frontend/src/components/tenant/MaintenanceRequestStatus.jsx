import { useRequestUpdates } from "./requestUpdates.js";

import { maintenanceRequests } from "./maintenanceRequests.js";
import { CheckCircle2, ChevronRight, Clock3 } from "lucide-react";

function MaintenanceRequestStatus({ onOpenChat }) {
const updates = useRequestUpdates();
const requests = maintenanceRequests.map(request=>updates[request.id]||request).map(request => ({
  ...request,
  submitted: "Submitted " + new Date(request.created).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  icon: request.status === "Resolved" ? CheckCircle2 : Clock3,
  style: request.status === "Resolved" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-700",
}));

  return <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)] sm:p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-bold text-slate-900">Maintenance requests</h2><p className="mt-0.5 truncate text-xs text-slate-500">Track updates from the building admin.</p></div><button type="button" onClick={onOpenChat} className="text-xs font-semibold text-blue-600 hover:underline">New request</button></div><div className="mt-3 divide-y divide-slate-100">{requests.map(({ title, submitted, status, detail, icon: Icon, style }) => <article key={title} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><span className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg "+style}><Icon size={17}/></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold text-slate-800">{title}</p><span className={"shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold "+style}>{status}</span></div><p className="mt-0.5 text-sm text-slate-500">{detail} · {submitted}</p></div><ChevronRight size={16} className="shrink-0 text-slate-300"/></article>)}</div></section>;
}

export default MaintenanceRequestStatus;
