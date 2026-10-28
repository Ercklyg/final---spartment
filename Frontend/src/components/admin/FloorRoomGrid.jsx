import { Building2, ChevronDown, DoorOpen, Layers3, LockKeyhole, Pencil, SearchX, Square, Trash2, UserRound, UsersRound } from "lucide-react";

const statuses = ["Available", "Occupied", "Reserved", "Maintenance"];
const tones = {
  Available: { badge: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500", icon: "bg-emerald-50 text-emerald-600" },
  Occupied: { badge: "border-blue-200 bg-blue-50 text-blue-700", dot: "bg-blue-500", icon: "bg-blue-50 text-blue-600" },
  Reserved: { badge: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500", icon: "bg-amber-50 text-amber-600" },
  Maintenance: { badge: "border-slate-200 bg-slate-100 text-slate-600", dot: "bg-slate-400", icon: "bg-slate-100 text-slate-500" },
};
const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 });

function FloorRoomGrid({ filter, query, rooms = [], sort, saving, onStatusChange, onEdit, onDelete }) {
  const shown = rooms.filter(room => (filter === "All Rooms" || room[2] === filter) && `${room[0]} ${room[3]} ${room[4]}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (sort === "status" ? a[2].localeCompare(b[2]) : 0) || String(a[0]).localeCompare(String(b[0]), undefined, { numeric: true }));
  const groups = [...new Set(shown.map(room => JSON.stringify([room[4], room[1]])))]
    .map(key => JSON.parse(key))
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }) || Number(a[1]) - Number(b[1]));

  return <div className="mt-5 space-y-7 sm:mt-7 sm:space-y-9">
    {groups.map(([building, floor]) => {
      const groupRooms = shown.filter(room => room[4] === building && room[1] === floor);
      const available = groupRooms.filter(room => room[2] === "Available").length;
      return <section key={JSON.stringify([building, floor])} aria-label={`${building}, Floor ${floor}`}>
        <div className="mb-3 flex items-start justify-between gap-2 sm:mb-4 sm:items-center sm:gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm"><Building2 size={21} strokeWidth={1.7} aria-hidden="true" /></span>
            <div className="min-w-0">
              <h2 className="break-words text-base font-bold tracking-tight text-slate-900">{building}</h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500"><Layers3 size={13} aria-hidden="true" />Floor {floor}<span className="mx-1 text-slate-300">/</span>{groupRooms.length} {query || filter !== "All Rooms" ? "matching " : ""}rooms</p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 sm:gap-2 sm:px-3 sm:text-xs"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{available} available</span>
        </div>

        <div className="grid items-start grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-3 sm:gap-4">
          {groupRooms.map(room => {
            const tone = tones[room[2]] || tones.Maintenance;
            return <article key={room[5] || room[0]} aria-label={`Room ${room[0]} in ${building}`} className="flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-slate-200/90 bg-white shadow-[0_2px_8px_-4px_rgba(15,23,42,0.12)] transition-shadow duration-200 hover:shadow-[0_12px_28px_-16px_rgba(15,23,42,0.25)] motion-reduce:transition-none">
              <div className="px-4 pb-3 pt-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}><DoorOpen size={23} strokeWidth={1.6} aria-hidden="true" /></span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />{room[2]}</span>
                </div>
                <div className="mt-3 sm:mt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Room</p>
                  <h3 className="mt-0.5 break-words text-3xl font-bold tracking-tight text-slate-900">{room[0]}</h3>
                </div>
                <div className="mt-3 flex flex-wrap items-baseline gap-1.5 sm:mt-4">
                  <p className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{room[6] == null ? "—" : money.format(Number(room[6]))}</p>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500 sm:mt-4">
                  <span className="inline-flex items-center gap-1.5"><Square size={14} strokeWidth={1.7} aria-hidden="true" />{room[8] == null ? "Size not set" : `${Number(room[8])} m²`}</span>
                  <span className="inline-flex items-center gap-1.5"><UsersRound size={15} strokeWidth={1.7} aria-hidden="true" />{room[9] || "Capacity not set"}</span>
                </div>
                <div className="mt-3 flex min-h-10 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[13px] text-slate-600 sm:mt-4 sm:text-sm">
                  <UserRound size={15} className="shrink-0 text-slate-400" aria-hidden="true" />
                  <span className="truncate" title={room[3]}>{room[3] === "Unassigned" ? "No tenant assigned" : room[3]}</span>
                  {room[10] && <LockKeyhole size={12} className="ml-auto shrink-0 text-slate-400" aria-label="Active tenant assignment" />}
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-50/50 px-4 pb-3 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
                <label className="block text-xs font-semibold text-slate-600">
                  Availability
                  <span className="relative mt-1.5 block">
                    <select aria-label={`Change status for room ${room[0]}`} disabled={Boolean(saving) || room[10]} value={room[2]} onChange={event => onStatusChange?.(room[5] || room[0], event.target.value)} title={room[10] ? "Availability is managed by the active tenant assignment." : undefined} className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500">
                      {statuses.map(status => <option key={status}>{status}</option>)}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  </span>
                </label>
                <div className="mt-2.5 flex flex-wrap gap-2 sm:mt-3">
                  <button
                    type="button"
                    disabled={Boolean(saving)}
                    onClick={() => onEdit(room)}
                    aria-label={`Edit room ${room[0]} in ${room[4]}`}
                    className="inline-flex h-11 min-w-[76px] flex-1 items-center justify-center gap-2 rounded-xl border border-blue-200/80 bg-blue-50 px-3 text-sm font-semibold text-blue-700 shadow-sm transition duration-150 enabled:hover:border-blue-600 enabled:hover:bg-blue-600 enabled:hover:text-white enabled:hover:shadow-md enabled:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:shadow-none motion-reduce:transition-none"
                  >
                    <Pencil size={15} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(saving) || room[10]}
                    onClick={() => onDelete(room)}
                    aria-label={`Delete room ${room[0]} in ${room[4]}`}
                    title={room[10] ? "This room has an assigned tenant." : "Delete room"}
                    className="inline-flex h-11 min-w-[76px] flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200/80 bg-rose-50 px-3 text-sm font-semibold text-rose-600 shadow-sm transition duration-150 enabled:hover:border-rose-600 enabled:hover:bg-rose-600 enabled:hover:text-white enabled:hover:shadow-md enabled:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:shadow-none motion-reduce:transition-none"
                  >
                    <Trash2 size={15} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                    Delete
                  </button>

                </div>
              </div>
            </article>;
          })}
        </div>
      </section>;
    })}
    {!groups.length && <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400"><SearchX size={25} aria-hidden="true" /></span>
      <h2 className="mt-4 text-base font-semibold text-slate-900">No matching rooms found</h2>
      <p className="mt-1 text-sm text-slate-500">{rooms.length ? "Try another search or room status." : "Add your first room to start managing availability."}</p>
    </div>}
  </div>;
}

export default FloorRoomGrid;
