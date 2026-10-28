import { useEffect, useMemo, useState } from "react";
import RoomCard from "./RoomCard.jsx";
import PageSkeleton from '../PageSkeleton.jsx';
import { api } from "../../lib/api.js";
import { useSessionState } from "../../lib/useSessionState.js";

function RoomGrid({ onInquire }) {
  const [selectedFloor, setSelectedFloor] = useSessionState("guest-room-floor-v2","all");
  const [selectedBuilding, setSelectedBuilding] = useSessionState("guest-room-building","all");
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const loadRooms = async () => {
      let data;
      try{data=await api.get("/public/rooms",{signal:controller.signal,cacheMs:60_000});}catch(error){if(error?.name!=='AbortError'){setLoadError("Unable to load rooms. Please refresh.");setIsLoading(false);}return;}

      if (controller.signal.aborted) return;
      setIsLoading(false);


      setRooms(data.map((room) => ({
        id: room.id,
        name: `Room ${room.room_number}`,
        floor: room.floor,
        status: room.status[0].toUpperCase() + room.status.slice(1),
        building: room.buildings?.name || "Building",
        size: `${Number(room.size_sqm)} m²`,
        capacity: room.capacity,
        description: room.description,
        price: Number(room.monthly_rate),
      })));
    };

    loadRooms();
    return () => controller.abort();
  }, []);

  const floors = [...new Set(rooms.map((room) => room.floor))];
  const buildings = [...new Set(rooms.map((room) => room.building))];
  const filteredRooms = useMemo(() => rooms.filter((room) =>
    (selectedFloor === "all" || room.floor === Number(selectedFloor)) &&
    (selectedBuilding === "all" || room.building === selectedBuilding),
  ), [rooms, selectedBuilding, selectedFloor]);

  return <section className="bg-[#f5f8fc] px-5 py-10 sm:px-8 sm:py-12">
    <div className="mx-auto max-w-[1240px]">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Available Units</p>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">{selectedBuilding === "all" ? "All Buildings" : selectedBuilding}{selectedFloor === "all" ? "" : ` · Floor ${selectedFloor}`}</h2>
          <p className="mt-1 text-sm text-slate-500">{isLoading ? "Loading available units..." : `${filteredRooms.length} unit${filteredRooms.length !== 1 ? "s" : ""} currently available`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600">{filteredRooms.length} Units</span>
          <select value={selectedFloor} onChange={(event) => setSelectedFloor(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10">
            <option value="all">All Floors</option>
            {floors.map((floor) => <option key={floor} value={floor}>Floor {floor}</option>)}
          </select>
          <select value={selectedBuilding} onChange={(event) => setSelectedBuilding(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" aria-label="Filter by building">
            <option value="all">All Buildings</option>
            {buildings.map((building) => <option key={building} value={building}>{building}</option>)}
          </select>
        </div>
      </div>
      {isLoading && <PageSkeleton variant="rooms" label="Loading available units..."/>}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredRooms.map((room) => <RoomCard key={room.id} room={room} onInquire={onInquire} />)}
      </div>
      {!isLoading && filteredRooms.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><p className="text-base font-semibold text-slate-700">{loadError || "No available rooms found"}</p><p className="mt-1 text-sm text-slate-400">{loadError ? "Please refresh the page and try again." : "Try selecting another building or floor."}</p></div>}
    </div>
  </section>;
}

export default RoomGrid;
