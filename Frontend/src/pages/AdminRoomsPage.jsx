import { useState } from "react";
import AdminHeader from "../components/admin/AdminHeader.jsx";
import AdminSidebar from "../components/admin/AdminSidebar.jsx";
import FloorRoomGrid from "../components/admin/FloorRoomGrid.jsx";
import RoomsToolbar from "../components/admin/RoomsToolbar.jsx";
function AdminRoomsPage({ onNavigate, onLogout }) { const [filter, setFilter] = useState("All Rooms"); const [query, setQuery] = useState(""); return <main className="flex min-h-screen bg-[#f6f9fd] text-slate-900"><AdminSidebar activePage="Rooms" onNavigate={onNavigate} /><div className="min-w-0 flex-1"><AdminHeader onLogout={onLogout} /><div className="mx-auto max-w-[1280px] px-6 pb-10 xl:px-8"><RoomsToolbar filter={filter} onFilter={setFilter} query={query} onQuery={setQuery} /><FloorRoomGrid filter={filter} query={query} /></div></div></main>; }
export default AdminRoomsPage;
