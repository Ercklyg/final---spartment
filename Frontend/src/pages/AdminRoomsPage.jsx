import PageSkeleton from "../components/PageSkeleton.jsx";

import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { useSessionState } from "../lib/useSessionState.js";
import AddRoomModal from "../components/admin/AddRoomModal.jsx";
import DeleteRoomModal from "../components/admin/DeleteRoomModal.jsx";
import AdminHeader from "../components/admin/AdminHeader.jsx";
import AdminSidebar from "../components/admin/AdminSidebar.jsx";
import FloorRoomGrid from "../components/admin/FloorRoomGrid.jsx";
import RoomsToolbar from "../components/admin/RoomsToolbar.jsx";

const toRow = room => [room.room_number, room.floor, room.status[0].toUpperCase() + room.status.slice(1), (room.tenant_assignments?.full_name || room.tenant_assignments?.[0]?.full_name) || (room.status === "occupied" ? "Occupied" : "Unassigned"), room.buildings?.name || "Building", room.id, Number(room.monthly_rate), room.description, room.size_sqm, room.capacity, Boolean(room.tenant_assignments?.full_name || room.tenant_assignments?.length)];

export default function AdminRoomsPage({ onNavigate, onLogout }) {
  const [filter, setFilter] = useSessionState("admin-rooms-filter", "All Rooms");
  const [query, setQuery] = useSessionState("admin-rooms-query", "");
  const [rooms, setRooms] = useState([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [deletingRoom, setDeletingRoom] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [sort, setSort] = useSessionState("admin-rooms-sort", "number");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api.get("/rooms",{signal:controller.signal,cacheMs:30_000,force:reload>0}).then(data => {
      setRooms(data.map(toRow)); setError("");
      setLoading(false);
    }).catch(error => { if(error?.name!=='AbortError'){setError("Unable to load rooms. Please retry.");setLoading(false);} });
    return () => controller.abort();
  }, [reload]);
  const addRoom = async room => {
    const data=await api.post("/rooms",room);
    setRooms(items=>[...items,toRow(data)]);
  };
  const updateRoomStatus = async (id, status) => {
    if (saving) return;
    const previous=rooms.find(room=>room[5]===id);
    setSaving(id); setError("");
    setRooms(items=>items.map(room=>room[5]===id?[...room.slice(0,2),status,...room.slice(3)]:room));
    try {
      const data = await api.patch("/rooms/"+id+"/status",{status:status.toLowerCase()});
      setRooms(items => items.map(room => room[5] === id ? toRow(data) : room));
    } catch { if(previous)setRooms(items=>items.map(room=>room[5]===id?previous:room));setError("Unable to save room status. The previous status was restored."); }
    finally { setSaving(null); }
  };
  const editRoom = async room => {
    const data = await api.patch("/rooms/" + editingRoom[5], room);
    setRooms(items => items.map(item => item[5] === data.id ? toRow(data) : item));
  };
  const deleteRoom = async id => {
    await api.delete("/rooms/" + id);
    setRooms(items => items.filter(room => room[5] !== id));
  };

  return <main className="flex min-h-screen bg-[#f6f9fd] text-slate-900">
    <AdminSidebar activePage="Rooms" onNavigate={onNavigate} />
    <div className="min-w-0 flex-1">
      <AdminHeader onLogout={onLogout} />
      <div className="mx-auto max-w-[1280px] px-4 pb-24 sm:px-6 lg:pb-10 xl:px-8">
        <RoomsToolbar filter={filter} onFilter={setFilter} query={query} onQuery={setQuery} onAdd={() => setIsAddOpen(true)} sort={sort} onSort={setSort} rooms={rooms} loading={loading} error={error} />
        <div aria-live="polite" aria-atomic="true">{saving&&<p role="status" className="mt-4 text-sm text-blue-700">Saving room status…</p>}{error && <div role="alert" className="mt-4 text-rose-700">{error} <button onClick={() => { setLoading(true); setError(""); setReload(n => n + 1); }} className="underline">Reload rooms</button></div>}</div>
        {loading ? <PageSkeleton variant="rooms" label="Loading rooms..." /> : <FloorRoomGrid filter={filter} query={query} rooms={rooms} sort={sort} saving={saving} onStatusChange={(id, status) => { const room = rooms.find(item => item[5] === id); if (room && status !== room[2]) setPendingStatus({ id, status, room }); }} onEdit={setEditingRoom} onDelete={setDeletingRoom} />}
      </div>
    </div>
    {isAddOpen && <AddRoomModal onClose={() => setIsAddOpen(false)} onAdd={addRoom} />}
    {editingRoom && <AddRoomModal key={editingRoom[5]} onClose={() => setEditingRoom(null)} onAdd={editRoom} initialRoom={{
      room: editingRoom[0], building: editingRoom[4], floor: String(editingRoom[1]),
      size: String(editingRoom[8]), rate: String(editingRoom[6]),
      capacity: String(editingRoom[9] || "2-3").replace(/\s*persons?\s*$/i, ""), notes: editingRoom[7] || "",
    }} />}
    {deletingRoom && <DeleteRoomModal room={deletingRoom} onClose={() => setDeletingRoom(null)} onDelete={deleteRoom} />}
    {pendingStatus && <div role="presentation" className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4">
      <section role="alertdialog" aria-modal="true" aria-labelledby="room-status-title" aria-describedby="room-status-description" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="room-status-title" className="text-lg font-bold text-slate-900">Confirm availability change</h2>
        <p id="room-status-description" className="mt-2 text-sm text-slate-600">Change room {pendingStatus.room[0]} in {pendingStatus.room[4]} from {pendingStatus.room[2].toLowerCase()} to {pendingStatus.status.toLowerCase()}?</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => setPendingStatus(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
          <button type="button" onClick={() => { const change = pendingStatus; setPendingStatus(null); updateRoomStatus(change.id, change.status); }} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Confirm change</button>
        </div>
      </section>
    </div>}
  </main>;
}
