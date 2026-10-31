import {
  BedDouble,
  MessageCircle,
} from "lucide-react";

import apartmentBuilding from "../../assets/apartment-building.webp";

function RoomCard({ room, onInquire }) {
  const isAvailable = room.status === "Available";

  const statusStyles = {

    Available: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Occupied: "bg-slate-100 text-slate-600 border-slate-200",
    Reserved: "bg-amber-50 text-amber-700 border-amber-100",
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:border-blue-200 hover:shadow-md">
      <div className="relative m-3 shrink-0 overflow-hidden rounded-xl bg-slate-100">
        <img
          src={room.image || apartmentBuilding}
          alt={room.image ? `${room.name} interior` : "Apartment building"}
          className="h-40 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-slate-950">
              {room.name}
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-600">
              Floor {room.floor}
              <span className="mx-1.5">•</span>
              {room.size}
              <span className="mx-1.5">•</span>
              Good for {room.capacity || "2–3 persons"}
            </p>
          </div>

          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyles[room.status]}`}
          >
            <span className="mr-1">
              •
            </span>
            {room.status}
          </span>
        </div>

        <p className="mb-4 mt-3 text-sm leading-5 text-slate-600">
          {room.description}
        </p>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 border-t border-slate-100 pt-4">
          <div>
            <span className="text-2xl font-extrabold tabular-nums tracking-tight text-slate-950">
              ₱{room.price.toLocaleString()}
            </span>

            <span className="ml-1 text-xs text-slate-500">
              /month
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-500">
            <BedDouble size={15} strokeWidth={1.7} />
            Furnished
          </div>
        </div>

        <button
          type="button"
          disabled={!isAvailable}
          onClick={() => isAvailable && onInquire(room)}
          className={`mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
            isAvailable
              ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
              : "cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-500"
          }`}
        >
          <MessageCircle size={17} strokeWidth={1.8} />

          {isAvailable ? "Inquire" : room.status}
        </button>
      </div>
    </article>
  );
}

export default RoomCard;
