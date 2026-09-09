import {
  BedDouble,
  MessageCircle,
} from "lucide-react";

import apartmentBuilding from "../../assets/apartment-building.jpg";

function RoomCard({ room, onInquire }) {
  const isVacant = room.status === "Vacant";

  const statusStyles = {
    Vacant: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Occupied: "bg-red-50 text-red-600 border-red-100",
    Reserved: "bg-amber-50 text-amber-700 border-amber-100",
  };

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,23,42,0.1)]">
      <div className="relative m-3 overflow-hidden rounded-xl bg-slate-100">
        <img
          src={room.image || apartmentBuilding}
          alt={`${room.name} interior`}
          className="h-[185px] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

        <span className="absolute bottom-3 right-3 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          1/5
        </span>
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-950">
              {room.name}
            </h3>

            <p className="mt-0.5 text-xs text-slate-400">
              Floor {room.floor}
              <span className="mx-1.5">•</span>
              {room.size}
              <span className="mx-1.5">•</span>
              Good for 1–2
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

        <div className="mt-5 flex items-end justify-between">
          <div>
            <span className="text-2xl font-extrabold tracking-tight text-slate-950">
              ₱{room.price.toLocaleString()}
            </span>

            <span className="ml-1 text-xs text-slate-400">
              /month
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-400">
            <BedDouble size={15} strokeWidth={1.7} />
            Furnished
          </div>
        </div>

        <button
          type="button"
          disabled={!isVacant}
          onClick={() => isVacant && onInquire(room)}
          className={`mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
            isVacant
              ? "bg-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.2)] hover:bg-blue-700"
              : "cursor-not-allowed bg-slate-200 text-slate-500"
          }`}
        >
          <MessageCircle size={17} strokeWidth={1.8} />

          {isVacant ? "Inquire" : "Unavailable"}
        </button>
      </div>
    </article>
  );
}

export default RoomCard;