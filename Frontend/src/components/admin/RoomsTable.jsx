import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronLeft, ChevronRight, LoaderCircle, LockKeyhole, MoreHorizontal, Pencil, SearchX, Trash2 } from "lucide-react";

const statuses = ["Available", "Occupied", "Reserved", "Maintenance"];
const tones = { Available: "bg-emerald-50 text-emerald-700 ring-emerald-600/15", Occupied: "bg-blue-50 text-blue-700 ring-blue-600/15", Reserved: "bg-amber-50 text-amber-800 ring-amber-600/15", Maintenance: "bg-slate-100 text-slate-600 ring-slate-500/15" };
const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 });
const compare = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true });

function RoomActions({ room, disabled, onEdit, onDelete, onStatusChange }) {
  const [menu, setMenu] = useState(null);
  const [changingStatus, setChangingStatus] = useState(false);
  const trigger = useRef(null);
  const panel = useRef(null);
  const menuId = useId();
  const close = () => { setMenu(null); setChangingStatus(false); trigger.current?.focus({ preventScroll: true }); };
  useEffect(() => {
    if (!menu) return;
    panel.current?.querySelector('[role="menuitem"]:not(:disabled)')?.focus({ preventScroll: true });
    const outside = event => { if (!panel.current?.contains(event.target) && !trigger.current?.contains(event.target)) { setMenu(null); setChangingStatus(false); } };
    const anchor = trigger.current.getBoundingClientRect();
    const dismiss = event => { if (panel.current?.contains(event.target)) return; const current = trigger.current.getBoundingClientRect(); if (event.type === "scroll" && current.top === anchor.top && current.left === anchor.left) return; setMenu(null); setChangingStatus(false); };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => { document.removeEventListener("pointerdown", outside); window.removeEventListener("resize", dismiss); window.removeEventListener("scroll", dismiss, true); };
  }, [menu, changingStatus]);
  const itemClass = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm outline-none hover:bg-slate-50 focus:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400";
  const choose = action => { close(); action(); };
  return <>
    <button ref={trigger} type="button" disabled={disabled} aria-label={`Actions for room ${room[0]} in ${room[4]}`} aria-haspopup="menu" aria-expanded={Boolean(menu)} aria-controls={menu ? menuId : undefined} onClick={() => {
      if (menu) { close(); return; }
      const rect = trigger.current.getBoundingClientRect();
      setMenu({ left: Math.max(8, Math.min(rect.right - 240, window.innerWidth - 248)), top: Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 330)) });
    }} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40"><MoreHorizontal size={20} aria-hidden="true"/></button>
    {menu && createPortal(<div ref={panel} id={menuId} role="menu" aria-label={`Room ${room[0]} actions`} style={menu} className="fixed z-[70] max-h-[calc(100dvh-16px)] w-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 text-slate-700 shadow-xl" onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key === "Tab") { close(); }
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const items = [...panel.current.querySelectorAll('[role="menuitem"]:not(:disabled), [role="menuitemradio"]:not(:disabled)')];
        const index = items.indexOf(document.activeElement);
        const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items[next]?.focus({ preventScroll: true });
      }
    }}>
      {changingStatus ? <>
        <button role="menuitem" type="button" className={itemClass} onClick={() => setChangingStatus(false)}><ChevronLeft size={15} aria-hidden="true"/>Back to actions</button>
        <div className="my-1 border-t border-slate-100"/>
        {statuses.map(status => <button key={status} role="menuitemradio" aria-checked={room[2] === status} type="button" className={itemClass} onClick={() => choose(() => onStatusChange(room[5], status))}><span className="flex-1">{status}</span>{room[2] === status && <Check size={15} aria-hidden="true"/>}</button>)}
      </> : <>
        <button role="menuitem" type="button" className={itemClass} onClick={() => choose(() => onEdit(room))}><Pencil size={15} aria-hidden="true"/>Edit room</button>
        <button role="menuitem" type="button" disabled={room[10]} aria-describedby={room[10] ? `${menuId}-reason` : undefined} className={itemClass} onClick={() => setChangingStatus(true)}><span className="flex-1">Change status</span><ChevronRight size={15} aria-hidden="true"/></button>
        {room[10] && <p id={`${menuId}-reason`} className="px-3 pb-2 text-xs leading-relaxed text-slate-500">Managed by lease. Assigned rooms cannot change status or be deleted here.</p>}
        <div className="my-1 border-t border-slate-100"/>
        <button role="menuitem" type="button" disabled={room[10]} aria-describedby={room[10] ? `${menuId}-reason` : undefined} className={`${itemClass} text-rose-600`} onClick={() => choose(() => onDelete(room))}><Trash2 size={15} aria-hidden="true"/>Delete room</button>
      </>}
    </div>, document.body)}
  </>;
}

export default function RoomsTable({ rooms = [], filter, query, building, floor, sort, saving, onStatusChange, onEdit, onDelete, onClearFilters }) {
  const search = query.trim().toLowerCase();
  const shown = rooms.filter(room => (filter === "All Rooms" || room[2] === filter) && (!building || room[4] === building) && (!floor || String(room[1]) === floor) && `${room[0]} ${room[3]} ${room[4]}`.toLowerCase().includes(search))
    .sort((a, b) => (sort === "status" ? compare(a[2], b[2]) : 0) || compare(a[0], b[0]) || compare(a[4], b[4]) || compare(a[1], b[1]));
  const filtered = query || filter !== "All Rooms" || building || floor;
  return <section aria-label="Room inventory" className="mt-5">
    <div className="mb-3 flex items-center justify-between gap-3 px-1"><p aria-live="polite" className="text-sm text-slate-500"><span className="font-semibold text-slate-800">{shown.length}</span> {filtered ? "matching " : ""}{shown.length === 1 ? "room" : "rooms"}</p><p className="text-xs text-slate-400 sm:hidden">Swipe to see more</p></div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div role="region" aria-label="Rooms table, scroll horizontally for more columns" tabIndex={0} className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500">
        <table className="w-full min-w-[740px] border-separate border-spacing-0 text-left text-sm">
          <caption className="sr-only">Rooms, tenant assignments, availability, and monthly rent</caption>
          <thead><tr className="text-xs font-medium text-slate-500">{["Room", "Tenant", "Status", "Monthly Rent", "Actions"].map((label, index) => <th key={label} scope="col" className={`border-b border-slate-200 bg-slate-50 px-5 py-3.5 font-medium ${index === 0 ? "sticky left-0 z-10 w-[24%] bg-slate-50" : ""} ${index === 3 ? "text-right" : ""} ${index === 4 ? "w-20 text-right" : ""}`}>{label}</th>)}</tr></thead>
          <tbody>{shown.map(room => <tr key={room[5]} aria-label={`Room ${room[0]} in ${room[4]}`} className="group">
            <th scope="row" className="sticky left-0 z-10 border-b border-slate-100 bg-white px-5 py-4 font-normal group-last:border-b-0 group-hover:bg-slate-50"><div className="flex items-center gap-2 font-semibold text-slate-900">{room[0]}</div><p className="mt-1 max-w-48 truncate text-xs text-slate-500" title={`${room[4]} · Floor ${room[1]}`}>{room[4]} · Floor {room[1]}</p></th>
            <td className="max-w-56 border-b border-slate-100 px-5 py-4 group-last:border-b-0 group-hover:bg-slate-50"><span title={room[3]} className={`block truncate ${room[3] === "Unassigned" ? "text-slate-400" : "text-slate-700"}`}>{room[3]}</span></td>
            <td className="border-b border-slate-100 px-5 py-4 group-last:border-b-0 group-hover:bg-slate-50"><div className="flex items-center gap-2"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${tones[room[2]] || tones.Maintenance}`}>{room[2]}</span>{room[10] && <LockKeyhole size={13} aria-label="Managed by lease" className="text-slate-400"/>}{saving === room[5] && <span role="status" className="text-blue-600"><LoaderCircle size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true"/><span className="sr-only">Saving availability</span></span>}</div></td>
            <td className="whitespace-nowrap border-b border-slate-100 px-5 py-4 text-right font-medium tabular-nums text-slate-800 group-last:border-b-0 group-hover:bg-slate-50">{room[6] == null || !Number.isFinite(room[6]) ? "—" : money.format(room[6])}</td>
            <td className="border-b border-slate-100 px-5 py-4 text-right group-last:border-b-0 group-hover:bg-slate-50"><RoomActions room={room} disabled={Boolean(saving)} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange}/></td>
          </tr>)}</tbody>
        </table>
      </div>
      {!shown.length && <div className="px-6 py-16 text-center"><SearchX size={28} aria-hidden="true" className="mx-auto text-slate-300"/><h2 className="mt-4 font-semibold text-slate-800">{rooms.length ? "No matching rooms" : "No rooms yet"}</h2><p className="mt-2 text-sm text-slate-500">{rooms.length ? "Try another search or adjust your filters." : "Add your first room to start managing availability."}</p>{filtered && <button type="button" onClick={onClearFilters} className="mt-4 rounded-lg px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500">Clear filters</button>}</div>}
    </div>
  </section>;
}
