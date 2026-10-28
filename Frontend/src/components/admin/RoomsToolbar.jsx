import { ArrowDownWideNarrow, CircleCheck, Plus, Search } from "lucide-react";

const filters = ["All Rooms", "Available", "Occupied", "Reserved", "Maintenance"];
const filterDots = { Available: "bg-emerald-500", Occupied: "bg-blue-500", Reserved: "bg-amber-500", Maintenance: "bg-slate-400" };

function RoomsToolbar({ filter, onFilter, query, onQuery, onAdd, sort, onSort, rooms = [], loading = false, error = "" }) {
  const countFor = status => status === "All Rooms" ? rooms.length : rooms.filter(room => room[2] === status).length;
  return <>
    <section className="flex flex-wrap items-center justify-between gap-3 pb-5 pt-6 sm:gap-4 sm:pb-6 sm:pt-8">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-600">Property management</p>
        <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Rooms</h1>
        <p className="mt-2 text-sm text-slate-500">A clear view of every room, all in one place.</p>
      </div>
      <button type="button" onClick={onAdd} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_4px_12px_-3px_rgba(37,99,235,0.4)] transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:transition-none sm:w-auto"><Plus size={18} aria-hidden="true" />Add Room</button>
    </section>

    <section aria-label="Room filters" className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <span className="sr-only">Search rooms</span>
          <input value={query} onChange={event => onQuery(event.target.value)} placeholder="Search rooms..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100" />
        </label>
        <button type="button" onClick={() => onSort(sort === "number" ? "status" : "number")} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><ArrowDownWideNarrow size={16} aria-hidden="true" />Sort: {sort === "number" ? "Room number" : "Status"}</button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 sm:flex sm:flex-wrap sm:items-center sm:gap-1.5">
        {filters.map(item => <button key={item} type="button" aria-pressed={filter === item} onClick={() => onFilter(item)} className={`${item === "All Rooms" ? "col-span-2 sm:col-span-1 " : ""}inline-flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:justify-start sm:py-2 ${filter === item ? "border-slate-900 bg-slate-900 text-white shadow-sm" : "border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800"}`}>
          {item === "All Rooms" ? <CircleCheck size={13} aria-hidden="true" /> : <span className={`h-1.5 w-1.5 rounded-full ${filterDots[item]}`} />}
          {item}
          <span className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${filter === item ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>{loading || error ? "—" : countFor(item)}</span>
        </button>)}
      </div>
    </section>
  </>;
}

export default RoomsToolbar;
