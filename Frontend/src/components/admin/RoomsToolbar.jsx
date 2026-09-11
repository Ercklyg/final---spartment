import { Plus, Search, SlidersHorizontal } from "lucide-react";

const filters = ["All Rooms", "Available", "Occupied", "Reserved", "Maintenance"];

function RoomsToolbar({ filter, onFilter, query, onQuery, onAdd, sort, onSort, rooms = [] }) {
  const countFor = status => status === "All Rooms" ? rooms.length : rooms.filter(room => room[2] === status).length;
  return <><section className="flex flex-col justify-between gap-4 py-5 md:flex-row md:items-end"><div><p className="text-xs font-bold tracking-[0.28em] text-slate-500">ROOMS</p><h1 className="mt-1 text-4xl font-extrabold">Rooms</h1><p className="mt-1 text-lg text-slate-500">Manage rooms and availability.</p></div><div className="flex gap-3"><label className="relative flex-1 md:w-[360px]"><Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={event => onQuery(event.target.value)} placeholder="Search room or tenant..." className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-3 text-sm"/></label><button type="button" onClick={onAdd} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white"><Plus size={18}/>Add Room</button></div></section><section className="flex flex-wrap items-center gap-2">{filters.map(item => <button key={item} type="button" onClick={() => onFilter(item)} className={`rounded-xl border px-3 py-2 text-sm ${filter === item ? "border-blue-200 bg-blue-50 text-blue-600" : "border-slate-200 bg-white"}`}><span>{item}</span><span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{countFor(item)}</span></button>)}<button type="button" onClick={() => onSort(sort === "number" ? "status" : "number")} className="ml-auto flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><SlidersHorizontal size={16}/>Sort: {sort === "number" ? "Room number" : "Status"}</button></section></>;
}

export default RoomsToolbar;
