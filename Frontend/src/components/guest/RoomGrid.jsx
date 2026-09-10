
import { useMemo, useState } from "react";
import RoomCard from "./RoomCard.jsx";



const rooms = [
[101,1,"Occupied"],[102,1,"Available"],[103,1,"Occupied"],[104,1,"Reserved"],[105,1,"Available"],[106,1,"Available"],[107,1,"Occupied"],[108,1,"Available"],[201,2,"Available"],[202,2,"Occupied"],[203,2,"Available"],[204,2,"Reserved"]
].map(([id,floor,status])=>({id,name:`Room ${id}`,floor,status,size:"20 sqm",price:6500}));
function RoomGrid({ onInquire }) {
  const [selectedFloor, setSelectedFloor] = useState("1");
  const [selectedStatus, setSelectedStatus] = useState("Available");

  const floors = [...new Set(rooms.map((room) => room.floor))];

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) =>
      (selectedFloor === "all" || room.floor === Number(selectedFloor)) &&
      (selectedStatus === "all" || room.status === selectedStatus)
    );
  }, [selectedFloor, selectedStatus]);

  const vacantCount = filteredRooms.filter(
      (room) => room.status === "Available"
  ).length;

  return (
    <section className="bg-[#f5f8fc] px-5 py-10 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
              Available Units
            </p>

            <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              Floor {selectedFloor === "all" ? "All" : selectedFloor}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {selectedStatus === "Available" ? `${vacantCount} unit${vacantCount !== 1 ? "s" : ""} currently available` : `${filteredRooms.length} matching unit${filteredRooms.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600">
              {filteredRooms.length} Units
            </span>

            <select
              value={selectedFloor}
              onChange={(event) =>
                setSelectedFloor(event.target.value)
              }
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            >
              <option value="all">
                All Floors
              </option>

              {floors.map((floor) => (
                <option
                  key={floor}
                  value={floor}
                >
                  Floor {floor}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              aria-label="Filter by availability"
            >
              <option value="all">All availability</option>
              <option value="Available">Available</option>
              <option value="Reserved">Reserved</option>
              <option value="Occupied">Occupied</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onInquire={onInquire}
            />
          ))}
        </div>

        {filteredRooms.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <p className="text-base font-semibold text-slate-700">
              No rooms found
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Try selecting another floor.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default RoomGrid;
