import { useRef, useState } from "react";
import { Plus, Search, SlidersHorizontal, X } from "lucide-react";

const statuses = ["All Rooms", "Available", "Occupied", "Reserved", "Maintenance"];
const inputStyle = "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function RoomsToolbar({ filter, onFilter, query, onQuery, onAdd, sort, onSort, building, onBuilding, floor, onFloor, rooms = [], loading, error, onClearFilters }) {
  const [expanded, setExpanded] = useState(false);
  const moreButton = useRef(null);
  const buildings = [...new Set(rooms.map(room => room[4]))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const floors = [...new Set(rooms.filter(room => !building || room[4] === building).map(room => String(room[1])))].sort((a, b) => Number(a) - Number(b));
  const chips = [
    query && { label: `Search: ${query}`, clear: () => onQuery("") },
    filter !== "All Rooms" && { label: filter, clear: () => onFilter("All Rooms") },
    building && { label: building, clear: () => onBuilding("") },
    floor && { label: `Floor ${floor}`, clear: () => onFloor("") },
  ].filter(Boolean);
  return <>
    <header className="flex flex-wrap items-center justify-between gap-4 pb-6 pt-7 sm:pt-9">
      <div><h1 className="text-3xl font-bold tracking-tight text-slate-950">Rooms</h1><p className="mt-2 text-sm text-slate-500">Manage your rooms and availability.</p></div>
      <button type="button" onClick={onAdd} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"><Plus size={17} aria-hidden="true"/>Add Room</button>
    </header>
    <section aria-label="Room filters" className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap gap-3">
        <label className="relative min-w-0 basis-full sm:basis-56 sm:flex-1"><Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true"/><span className="sr-only">Search rooms</span><input value={query} onChange={event => onQuery(event.target.value)} placeholder="Search room, tenant, or building" className={`${inputStyle} w-full pl-10`}/></label>
        <label className="min-w-0 flex-1 sm:flex-none"><span className="sr-only">Room status</span><select aria-label="Room status" value={filter} onChange={event => onFilter(event.target.value)} className={`${inputStyle} w-full sm:w-40`}>{statuses.map(status => <option key={status} value={status}>{status === "All Rooms" ? "All statuses" : status}</option>)}</select></label>
        <label className="min-w-0 flex-1 sm:flex-none"><span className="sr-only">Building</span><select aria-label="Building" value={building} onChange={event => onBuilding(event.target.value)} className={`${inputStyle} w-full sm:max-w-48`}><option value="">All buildings</option>{buildings.map(name => <option key={name}>{name}</option>)}</select></label>
        <button ref={moreButton} type="button" aria-expanded={expanded} aria-controls="room-more-filters" onClick={() => setExpanded(value => !value)} className={`${inputStyle} inline-flex w-full items-center justify-center gap-2 sm:w-auto ${floor || sort !== "number" ? "border-blue-200 text-blue-700" : ""}`}><SlidersHorizontal size={16} aria-hidden="true"/>More filters{(floor || sort !== "number") && <span className="h-1.5 w-1.5 rounded-full bg-blue-500"/>}</button>
      </div>
      {expanded && <div id="room-more-filters" onKeyDown={event => { if (event.key === "Escape") { setExpanded(false); moreButton.current?.focus(); } }} className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
        <label className="flex min-w-36 flex-1 flex-col gap-1.5 text-xs font-medium text-slate-500 sm:max-w-48">Floor<select aria-label="Floor" value={floor} onChange={event => onFloor(event.target.value)} className={inputStyle}><option value="">All floors</option>{floors.map(value => <option key={value} value={value}>Floor {value}</option>)}</select></label>
        <label className="flex min-w-36 flex-1 flex-col gap-1.5 text-xs font-medium text-slate-500 sm:max-w-48">Sort by<select aria-label="Sort by" value={sort} onChange={event => onSort(event.target.value)} className={inputStyle}><option value="number">Room number</option><option value="status">Status</option></select></label>
      </div>}
      {chips.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2">{chips.map((chip, index) => <button type="button" key={index} onClick={chip.clear} aria-label={`Remove filter ${chip.label}`} className="inline-flex max-w-full items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500"><span className="truncate">{chip.label}</span><X size={12} className="shrink-0" aria-hidden="true"/></button>)}<button type="button" onClick={onClearFilters} className="px-2 py-1.5 text-xs font-medium text-blue-600 hover:underline focus-visible:ring-2 focus-visible:ring-blue-500">Clear all</button></div>}
      <p className="sr-only" aria-live="polite">{loading || error ? "Room totals unavailable" : `${rooms.length} total rooms`}</p>
    </section>
  </>;
}
