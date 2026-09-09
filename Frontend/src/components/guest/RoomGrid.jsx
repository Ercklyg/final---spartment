import { useMemo, useState } from "react";
import RoomCard from "./RoomCard.jsx";

const rooms = [
  {
    id: 101,
    name: "Room 101",
    floor: 1,
    size: "20 sqm",
    price: 6500,
    status: "Occupied",
  },
  {
    id: 102,
    name: "Room 102",
    floor: 1,
    size: "20 sqm",
    price: 6500,
    status: "Vacant",
  },
  {
    id: 103,
    name: "Room 103",
    floor: 1,
    size: "20 sqm",
    price: 6500,
    status: "Occupied",
  },
  {
    id: 104,
    name: "Room 104",
    floor: 1,
    size: "20 sqm",
    price: 6500,
    status: "Reserved",
  },
  {
    id: 105,
    name: "Room 105",
    floor: 1,
    size: "20 sqm",
    price: 6500,
    status: "Vacant",
  },
  {
    id: 106,
    name: "Room 106",
    floor: 1,
    size: "20 sqm",
    price: 6500,
    status: "Vacant",
  },
  {
    id: 107,
    name: "Room 107",
    floor: 1,
    size: "20 sqm",
    price: 6500,
    status: "Occupied",
  },
  {
    id: 108,
    name: "Room 108",
    floor: 1,
    size: "20 sqm",
    price: 6500,
    status: "Vacant",
  },
  {
    id: 201,
    name: "Room 201",
    floor: 2,
    size: "20 sqm",
    price: 6500,
    status: "Vacant",
  },
  {
    id: 202,
    name: "Room 202",
    floor: 2,
    size: "20 sqm",
    price: 6500,
    status: "Occupied",
  },
  {
    id: 203,
    name: "Room 203",
    floor: 2,
    size: "20 sqm",
    price: 6500,
    status: "Vacant",
  },
  {
    id: 204,
    name: "Room 204",
    floor: 2,
    size: "20 sqm",
    price: 6500,
    status: "Reserved",
  },
];

function RoomGrid({ onInquire }) {
  const [selectedFloor, setSelectedFloor] = useState("1");

  const floors = [...new Set(rooms.map((room) => room.floor))];

  const filteredRooms = useMemo(() => {
    if (selectedFloor === "all") {
      return rooms;
    }

    return rooms.filter(
      (room) => room.floor === Number(selectedFloor)
    );
  }, [selectedFloor]);

  const vacantCount = filteredRooms.filter(
    (room) => room.status === "Vacant"
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
              {vacantCount} unit{vacantCount !== 1 ? "s" : ""} currently available
            </p>
          </div>

          <div className="flex items-center gap-3">
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