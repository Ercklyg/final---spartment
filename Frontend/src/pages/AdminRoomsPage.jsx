
import { useState } from "react";
import AddRoomModal from "../components/admin/AddRoomModal.jsx";
import AdminHeader from "../components/admin/AdminHeader.jsx";
import AdminSidebar from "../components/admin/AdminSidebar.jsx";
import FloorRoomGrid,{roomData} from "../components/admin/FloorRoomGrid.jsx";
import RoomsToolbar from "../components/admin/RoomsToolbar.jsx";
function AdminRoomsPage({onNavigate,onLogout}){const [filter,setFilter]=useState("All Rooms");const [query,setQuery]=useState("");const [rooms,setRooms]=useState(roomData);const [isAddOpen,setIsAddOpen]=useState(false);const [sort,setSort]=useState("number");const addRoom=(room)=>setRooms(items=>[...items,[room.room,room.floor,room.status,room.tenant,room.building]]);const updateRoomStatus=(roomNumber,status)=>setRooms(items=>items.map(room=>room[0]===roomNumber?[...room.slice(0,2),status,...room.slice(3)]:room));return <main className="flex min-h-screen bg-[#f6f9fd] text-slate-900"><AdminSidebar activePage="Rooms" onNavigate={onNavigate}/><div className="min-w-0 flex-1"><AdminHeader onLogout={onLogout}/><div className="mx-auto max-w-[1280px] px-6 pb-10 xl:px-8"><RoomsToolbar filter={filter} onFilter={setFilter} query={query} onQuery={setQuery} onAdd={()=>setIsAddOpen(true)} sort={sort} onSort={setSort} rooms={rooms}/><FloorRoomGrid filter={filter} query={query} rooms={rooms} sort={sort} onStatusChange={updateRoomStatus}/></div></div>{isAddOpen&&<AddRoomModal onClose={()=>setIsAddOpen(false)} onAdd={addRoom}/>}</main>;}
export default AdminRoomsPage;
