import PageSkeleton from "../components/PageSkeleton.jsx";

import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import AddRoomModal from "../components/admin/AddRoomModal.jsx";
import DeleteRoomModal from "../components/admin/DeleteRoomModal.jsx";
import AdminHeader from "../components/admin/AdminHeader.jsx";
import AdminSidebar from "../components/admin/AdminSidebar.jsx";
import FloorRoomGrid from "../components/admin/FloorRoomGrid.jsx";
import RoomsToolbar from "../components/admin/RoomsToolbar.jsx";

const toRow = room => [room.room_number, room.floor, room.status[0].toUpperCase() + room.status.slice(1), (room.tenant_assignments?.full_name || room.tenant_assignments?.[0]?.full_name) || (room.status === "occupied" ? "Occupied" : "Unassigned"), room.buildings?.name || "Building", room.id, Number(room.monthly_rate), room.description, room.size_sqm, room.capacity, Boolean(room.tenant_assignments?.full_name || room.tenant_assignments?.length)];

export default function AdminRoomsPage({ onNavigate, onLogout }) {
  const [filter, setFilter] = useState("All Rooms");
  const [query, setQuery] = useState("");
  const [rooms, setRooms] = useState([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [deletingRoom, setDeletingRoom] = useState(null);
  const [sort, setSort] = useState("number");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    api.get("/rooms").then(data => {
      if (!active) return;
      setRooms(data.map(toRow)); setError("");
      setLoading(false);
    }).catch(() => { if (active) { setError("Unable to load rooms. Please retry."); setLoading(false); } });
    return () => { active = false; };
  }, [reload]);
  const addRoom = async room => {
    const data=await api.post("/rooms",room);
    setRooms(items=>[...items,toRow(data)]);
  };
  const updateRoomStatus = async (id, status) => {
    if (saving) return;
    setSaving(id); setError("");
    try {
      const data = await api.patch("/rooms/"+id+"/status",{status:status.toLowerCase()});
      setRooms(items => items.map(room => room[5] === id ? toRow(data) : room));
    } catch { setError("Unable to save room status. Please try again."); }
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
        {error && <div role="alert" className="mt-4 text-rose-700">{error} <button onClick={() => { setLoading(true); setError(""); setReload(n => n + 1); }} className="underline">Reload rooms</button></div>}
        {loading ? <PageSkeleton variant="rooms" label="Loading rooms..." /> : <FloorRoomGrid filter={filter} query={query} rooms={rooms} sort={sort} saving={saving} onStatusChange={updateRoomStatus} onEdit={setEditingRoom} onDelete={setDeletingRoom} />}
      </div>
    </div>
    {isAddOpen && <AddRoomModal onClose={() => setIsAddOpen(false)} onAdd={addRoom} />}
    {editingRoom && <AddRoomModal key={editingRoom[5]} onClose={() => setEditingRoom(null)} onAdd={editRoom} initialRoom={{
      room: editingRoom[0], building: editingRoom[4], floor: String(editingRoom[1]),
      size: String(editingRoom[8]), rate: String(editingRoom[6]),
      capacity: String(editingRoom[9] || "2-3").replace(/\s*persons?\s*$/i, ""), notes: editingRoom[7] || "",
    }} />}
    {deletingRoom && <DeleteRoomModal room={deletingRoom} onClose={() => setDeletingRoom(null)} onDelete={deleteRoom} />}
  </main>;
}
