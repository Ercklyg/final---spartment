import { ArrowRight, LogOut, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { money } from "../../lib/billing.js";
import { api } from "../../lib/api.js";
import { leaseHistory, moveOut } from "../../lib/tenancy.js";
import MoveOutDialog from "./MoveOutDialog.jsx";
import { closeFromBackdrop } from "../../lib/dialog.js";
import { TestBadge } from "./TestRecords.jsx";

const tone = {
  Paid: "bg-emerald-50 text-emerald-800",
  Pending: "bg-amber-50 text-amber-700",
  "Partially paid": "bg-orange-50 text-orange-700",
  Late: "bg-rose-50 text-rose-800",
};
const cardAccent = {
  Paid: "bg-emerald-500",
  Pending: "bg-amber-400",
  "Partially paid": "bg-orange-400",
  Late: "bg-rose-500",
  Unavailable: "bg-slate-400",
};
const statusLabel = status => status === "Late" ? "Overdue" : status || "Unavailable";
const roomLabel = tenant => tenant.rooms?.buildings?.name ? `${tenant.rooms.buildings.name} / Room ${tenant.room}` : tenant.room;
function TenancyBadge({ status }) {
  const active = status === "active";
  return <span className={"inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold leading-4 " + (active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-100 text-slate-700")}><span aria-hidden="true" className={"h-1.5 w-1.5 rounded-full " + (active ? "bg-emerald-600" : "bg-slate-500")} />{active ? "Active" : "Moved out"}</span>;
}
const moveOutDate = tenant => tenant.move_out_date || tenant.leaseEnd || "Not recorded";
const amountLabel = value => value == null ? "Unavailable" : money(value);

function TenantDetails({ tenant, leases, leasesLoading, onClose, onMoveOut, onChanged }) {
  const [classifying, setClassifying] = useState(false);
  const [classificationError, setClassificationError] = useState('');
  const classify = async () => {
    setClassifying(true); setClassificationError('');
    try {
      await api.patch('/records/test-status', {kind:'tenant',id:tenant.id,isTest:!tenant.test_account});
      onClose(); onChanged?.();
    } catch (error) { setClassificationError(error.message); }
    finally { setClassifying(false); }
  };
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current.showModal();
    return () => previous?.focus();
  }, []);
  const activeLease = (leases || []).find(lease => lease.status === "active");
  return <dialog ref={dialog} onMouseDown={event=>closeFromBackdrop(event,onClose)} onCancel={onClose} aria-labelledby="tenant-details-heading" className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl bg-white p-5 backdrop:bg-slate-950/40 sm:p-6">
    <button type="button" onClick={onClose} aria-label="Close tenant details" className="float-right rounded-lg p-1 hover:bg-slate-100"><X /></button>
    <h2 id="tenant-details-heading" className="break-words text-xl font-bold leading-tight sm:text-2xl">{tenant.name}{tenant.is_test && <TestBadge/>}</h2><p className="mt-1 break-all text-sm text-slate-500">{tenant.email}</p>
    <div className="mt-3 flex flex-wrap items-center gap-2"><TenancyBadge status={tenant.status}/>{tenant.status === "ended" && <span className="text-xs text-slate-500">Moved out: {moveOutDate(tenant)}</span>}</div>
    <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/50 p-3 text-sm">
      <p>{tenant.is_test ? 'Test records remain accessible and are excluded from operational reports.' : 'This account is included in operational reports.'}</p>
      {tenant.room_is_test && <p className="mt-1 text-xs text-slate-600">The assigned room is also a test room. Change its classification in Rooms to include its records.</p>}
      <button type="button" disabled={classifying} onClick={classify} className="mt-2 rounded-lg border border-violet-200 bg-white px-3 py-2 font-semibold text-violet-700 disabled:opacity-50">{classifying ? 'Saving...' : tenant.test_account ? 'Remove test account flag' : 'Mark as test account'}</button>
      {classificationError && <p role="alert" className="mt-2 text-rose-700">{classificationError}</p>}
    </div>
    <dl className="mt-5 grid gap-2.5 text-sm sm:mt-6 sm:grid-cols-2 [&>div]:rounded-xl [&>div]:border [&>div]:border-slate-100 [&>div]:bg-slate-50/70 [&>div]:p-3">
      <div><dt className="text-slate-500">Phone number</dt><dd className="mt-1 font-semibold">{tenant.phone}</dd></div>
      <div><dt className="text-slate-500">Emergency contact</dt><dd className="mt-1 font-semibold">{tenant.emergencyName} · {tenant.emergencyPhone} ({tenant.relationship})</dd></div>
      <div><dt className="text-slate-500">{tenant.status === "ended" ? "Previous room" : "Assigned room"}</dt><dd className="mt-1 text-lg font-bold">{roomLabel(tenant)}</dd></div>
      <div><dt className="text-slate-500">Monthly rent</dt><dd className="mt-1 font-bold">{amountLabel(tenant.rent)}</dd></div>
      <div><dt className="text-slate-500">Payment status</dt><dd className="mt-1 font-bold">{statusLabel(tenant.billing?.status)}</dd></div>
      <div><dt className="text-slate-500">Outstanding balance</dt><dd className="mt-1 font-bold">{amountLabel(tenant.billing?.balance)}</dd></div>
      <div><dt className="text-slate-500">Overdue balance</dt><dd className="mt-1 font-bold">{amountLabel(tenant.billing?.overdue)}</dd></div>
      <div><dt className="text-slate-500">Tenancy dates</dt><dd className="mt-1 font-semibold">Move-in: {tenant.moveIn}{tenant.leaseEnd ? " · Lease ends: " + tenant.leaseEnd : ""}</dd></div>
      {tenant.address && <div><dt className="text-slate-500">Previous address</dt><dd>{tenant.address}</dd></div>}
    </dl>
    <p className="mt-4 text-xs text-slate-500">{tenant.billing ? tenant.billing.billCount + " issued rent and utility bills. Overdue amounts are included in the outstanding balance." : "Billing information is unavailable. Refresh tenants to try again."}</p>
    <h3 className="mt-6 font-semibold">Lease history</h3>
    {leasesLoading ? <p className="mt-2 text-sm text-slate-500">Loading leases...</p>
      : !leases?.length ? <p className="mt-2 text-sm text-slate-500">No leases found.</p>
      : <ul className="mt-2 space-y-2">{leases.map(lease => <li key={lease.id} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><span className="font-semibold">{lease.rooms?.buildings?.name || "Building"} / Room {lease.rooms?.room_number || "—"}</span><span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">{lease.status}</span><span className="block text-xs text-slate-500">{lease.move_in_date}{lease.lease_end_date ? " → " + lease.lease_end_date : ""}</span></li>)}</ul>}
    <button type="button" disabled={!activeLease} onClick={onMoveOut} title={activeLease ? "Record a move-out" : "No active lease to end"} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><LogOut size={17} />Move out</button>
  </dialog>;
}

export default function TenantCardGrid({ addedTenants = [], onChanged, search = "", onClearSearch, filtered = false }) {
  const [selectedId, setSelectedId] = useState(null);
  const [leases, setLeases] = useState([]);
  const [leasesLoading, setLeasesLoading] = useState(false);
  const [moveOutOpen, setMoveOutOpen] = useState(false);
  const selected = addedTenants.find(tenant => tenant.id === selectedId);
  const selectTenant = id => { setSelectedId(id); setLeases([]); setLeasesLoading(true); };
  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    leaseHistory(api.withSignal(controller.signal), selectedId).then(data => { setLeases(Array.isArray(data) ? data : data?.data || []); setLeasesLoading(false); })
      .catch(error => { if(error?.name!=='AbortError'){setLeases([]);setLeasesLoading(false);} });
    return () => controller.abort();
  }, [selectedId]);
  const closeDetails = () => { setSelectedId(null); setMoveOutOpen(false); };
  const submitMoveOut = async form => {
    const activeLease = leases.find(lease => lease.status === "active");
    if (!activeLease) throw new Error("No active lease found. Refresh tenants and retry.");
    await moveOut(api, selected.id, { ...form, leaseId: activeLease.id });
    closeDetails();
    await onChanged?.();
  };
  return <>
    {!addedTenants.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="font-semibold text-slate-800">{search || filtered ? "No matching tenants found" : "No tenants yet"}</p><p className="mt-1 text-sm text-slate-500">{search || filtered ? "Try another search, tenancy status, or payment status." : "Add a tenant to assign an available room."}</p>{(search || filtered) && <button type="button" onClick={onClearSearch} className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100">Clear filters</button>}</div>}
    <section className="grid min-w-0 gap-3 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
      {addedTenants.map(tenant => {
        const status = tenant.billing?.status || "Unavailable";
        const balance = Number(tenant.billing?.balance || 0);
        const overdue = Number(tenant.billing?.overdue || 0);
        const balanceColor = overdue > 0 ? "text-rose-600" : balance > 0 ? "text-amber-700" : "text-emerald-800";
        return <article key={tenant.id} className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white p-4 shadow-sm transition duration-200 hover:border-slate-400 hover:shadow-md sm:p-5">
          <span className={`absolute inset-x-0 top-0 h-1 ${cardAccent[status] || cardAccent.Unavailable}`} aria-hidden="true" />
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-sm sm:h-12 sm:w-12 sm:text-base">{tenant.name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join("")}</span>
            <div className="min-w-0 flex-1"><h2 className="line-clamp-2 break-words text-sm font-bold leading-5 sm:text-base">{tenant.name}{tenant.is_test && <TestBadge/>}</h2><p className="mt-0.5 truncate text-xs text-slate-500 sm:text-sm" title={tenant.email}>{tenant.email}</p><div className="mt-2 flex flex-wrap items-center gap-2"><TenancyBadge status={tenant.status}/></div></div>
          </div>
          <div className="mt-4 grid min-w-0 grid-cols-2 gap-3 text-sm sm:mt-5 sm:grid-cols-3 sm:gap-2">
            <div className="min-w-0"><p className="text-slate-500">{tenant.status === "ended" ? "Previous room" : "Room"}</p><strong className="break-words">{roomLabel(tenant)}</strong></div>
            <div className="min-w-0"><p className="text-slate-500">Payment</p><span className={"inline-block rounded-full px-2 py-1 text-xs " + (tone[status] || "bg-slate-100 text-slate-600")}>{statusLabel(status)}</span></div>
            <div className="col-span-2 min-w-0 border-t border-slate-100 pt-2 sm:col-span-1 sm:border-0 sm:pt-0"><p className="text-slate-500">Outstanding</p><strong className={`break-words ${balanceColor}`}>{amountLabel(tenant.billing?.balance)}</strong></div>
          </div>
          {tenant.status === "ended" && <p className="mt-3 text-xs text-slate-500">Moved out: {moveOutDate(tenant)}</p>}
          <div className="flex-1" />
          <button type="button" onClick={() => selectTenant(tenant.id)} className="mt-4 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50/50 px-3 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100/70">View details <ArrowRight size={16} /></button>
        </article>;
      })}
    </section>
    {selected && !moveOutOpen && <TenantDetails key={selected.id} tenant={selected} leases={leases} leasesLoading={leasesLoading} onClose={() => setSelectedId(null)} onMoveOut={() => setMoveOutOpen(true)} onChanged={onChanged} />}
    {selected && moveOutOpen && <MoveOutDialog tenant={selected} onClose={() => setMoveOutOpen(false)} onDone={submitMoveOut} />}
  </>;
}
