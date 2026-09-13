import { Building2 } from "lucide-react";

const colors = { Occupied: "bg-rose-50 text-rose-600", Available: "bg-emerald-50 text-emerald-600", Reserved: "bg-amber-50 text-amber-700", Maintenance: "bg-slate-100 text-slate-700" };
const statuses = ["Available", "Occupied", "Reserved", "Maintenance"];

function FloorRoomGrid({ filter, query, rooms = [], sort, saving, onStatusChange }) {
  const shown = rooms.filter(room => (filter === "All Rooms" || room[2] === filter) && `${room[0]} ${room[3]} ${room[4]}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sort === "status" ? a[2].localeCompare(b[2]) : a[0].localeCompare(b[0]));
  const groups = [...new Set(shown.map(room => `${room[4]}|${room[1]}`))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return <div className="mt-5 space-y-5">{groups.map(group => { const [building, floor] = group.split("|"); const groupRooms = shown.filter(room => room[4] === building && String(room[1]) === floor); return <section key={group} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4 flex items-center gap-3"><Building2 className="text-blue-600"/><div><h2 className="font-bold">{building} · Floor {floor}</h2><p className="text-sm text-slate-500">{groupRooms.length} room{groupRooms.length !== 1 ? "s" : ""}</p></div></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{groupRooms.map(room => <article key={room[5] || room[0]} className="rounded-xl border border-slate-200 p-4"><div className="flex justify-between gap-2"><h3 className="text-xl font-bold">{room[0]}</h3><span className={`rounded-full px-2 py-1 text-xs ${colors[room[2]]}`}>{room[2]}</span></div><p className="mt-3 text-sm text-slate-500">{room[3]}</p><p className="mt-3 font-bold">₱{Number(room[6] ?? 6500).toLocaleString()}<span className="font-normal text-slate-500">/mo</span></p><label className="mt-4 block text-xs font-medium text-slate-500">Room status<select aria-label={`Change status for room ${room[0]}`} disabled={Boolean(saving) || room[10]} value={room[2]} onChange={event => onStatusChange?.(room[5] || room[0], event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">{statuses.map(status => <option key={status}>{status}</option>)}</select></label></article>)}</div></section>; })}{!groups.length && <p className="rounded-xl bg-white p-8 text-center text-slate-500">No matching rooms found.</p>}</div>;
}


export default FloorRoomGrid;
