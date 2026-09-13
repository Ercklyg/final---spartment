import { Pencil, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { money } from "../../lib/billing.js";

const tone = {
  Paid: "bg-emerald-50 text-emerald-600",
  Pending: "bg-amber-50 text-amber-700",
  "Partially paid": "bg-orange-50 text-orange-700",
  Late: "bg-rose-50 text-rose-600",
};
const amountLabel = value => value == null ? "Unavailable" : money(value);

function TenantDetails({ tenant, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current.showModal();
    return () => previous?.focus();
  }, []);
  return <dialog ref={dialog} onCancel={onClose} aria-labelledby="tenant-details-heading" className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl bg-white p-6 backdrop:bg-slate-950/40">
    <button type="button" onClick={onClose} aria-label="Close tenant details" className="float-right rounded-lg p-1 hover:bg-slate-100"><X /></button>
    <h2 id="tenant-details-heading" className="text-2xl font-bold">{tenant.name}</h2><p className="mt-1 break-words text-sm text-slate-500">{tenant.email}</p>
    <dl className="mt-6 grid gap-4 text-sm">
      <div><dt className="text-slate-500">Phone number</dt><dd className="mt-1 font-semibold">{tenant.phone}</dd></div>
      <div><dt className="text-slate-500">Emergency contact</dt><dd className="mt-1 font-semibold">{tenant.emergencyName} · {tenant.emergencyPhone} ({tenant.relationship})</dd></div>
      <div><dt className="text-slate-500">Assigned room</dt><dd className="mt-1 text-lg font-bold">{tenant.room}</dd></div>
      <div><dt className="text-slate-500">Monthly rent</dt><dd className="mt-1 font-bold">{amountLabel(tenant.rent)}</dd></div>
      <div><dt className="text-slate-500">Payment status</dt><dd className="mt-1 font-bold">{tenant.billing?.status || "Unavailable"}</dd></div>
      <div><dt className="text-slate-500">Outstanding balance</dt><dd className="mt-1 font-bold">{amountLabel(tenant.billing?.balance)}</dd></div>
      <div><dt className="text-slate-500">Overdue balance</dt><dd className="mt-1 font-bold">{amountLabel(tenant.billing?.overdue)}</dd></div>
      <div><dt className="text-slate-500">Tenancy dates</dt><dd className="mt-1 font-semibold">Move-in: {tenant.moveIn}{tenant.leaseEnd ? " · Lease ends: " + tenant.leaseEnd : ""}</dd></div>
      {tenant.address && <div><dt className="text-slate-500">Previous address</dt><dd>{tenant.address}</dd></div>}
    </dl>
    <p className="mt-4 text-xs text-slate-500">{tenant.billing ? tenant.billing.billCount + " issued rent and utility bills. Overdue amounts are included in the outstanding balance." : "Billing information is unavailable. Refresh tenants to try again."}</p>
  </dialog>;
}

export default function TenantCardGrid({ addedTenants = [] }) {
  const [selectedId, setSelectedId] = useState(null);
  const selected = addedTenants.find(tenant => tenant.id === selectedId);
  return <>
    {!addedTenants.length && <p className="p-8 text-slate-500">No tenants yet. Add a tenant to assign an available room.</p>}
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {addedTenants.map(tenant => {
        const status = tenant.billing?.status || "Unavailable";
        return <article key={tenant.id} className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-white">{tenant.name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join("")}</span>
            <div className="min-w-0 flex-1"><h2 className="truncate font-bold">{tenant.name}</h2><p className="truncate text-sm text-slate-500">{tenant.email}</p></div>
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-600">Active</span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
            <div className="min-w-0"><p className="text-slate-500">Room</p><strong className="break-words">{tenant.room}</strong></div>
            <div><p className="text-slate-500">Payment</p><span className={"inline-block rounded-full px-2 py-1 text-xs " + (tone[status] || "bg-slate-100 text-slate-600")}>{status}</span></div>
            <div className="min-w-0"><p className="text-slate-500">Balance</p><strong className="break-words">{amountLabel(tenant.billing?.balance)}</strong></div>
          </div>
          <button type="button" onClick={() => setSelectedId(tenant.id)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium"><Pencil size={17} />View details</button>
        </article>;
      })}
    </section>
    {selected && <TenantDetails key={selected.id} tenant={selected} onClose={() => setSelectedId(null)} />}
  </>;
}
