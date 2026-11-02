import { Building2, MessageCircle, UsersRound } from "lucide-react";

const buildingThemes=[
  "from-blue-700 via-blue-600 to-cyan-500",
  "from-indigo-700 via-violet-600 to-blue-500",
  "from-slate-700 via-blue-700 to-sky-500",
];
const themeFor=value=>buildingThemes[[...String(value)].reduce((sum,character)=>sum+character.charCodeAt(0),0)%buildingThemes.length];

function RoomCard({ room, onInquire }) {
  const isAvailable=room.status==="Available";
  const statusStyles={Available:"border-emerald-200 bg-emerald-50 text-emerald-700",Occupied:"border-slate-200 bg-slate-100 text-slate-600",Reserved:"border-amber-200 bg-amber-50 text-amber-700"};
  return <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_26px_-20px_rgba(15,23,42,0.3)] transition duration-200 hover:border-blue-200 hover:shadow-[0_16px_34px_-22px_rgba(37,99,235,0.38)] motion-reduce:transition-none">
    <div className={`relative m-3 flex h-36 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br ${themeFor(room.building)}`}>
      <div className="absolute -right-8 -top-12 h-36 w-36 rounded-full border-[24px] border-white/10"/>
      <div className="absolute -bottom-12 -left-7 h-32 w-32 rounded-full bg-white/10 blur-sm"/>
      <div className="relative flex w-full items-center justify-between gap-4 p-5 text-white">
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">{room.building}</p><p className="mt-1 truncate text-2xl font-extrabold tracking-tight">{room.name}</p><p className="mt-1 text-xs font-medium text-white/80">Floor {room.floor} · {room.size}</p></div>
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm"><Building2 size={27} strokeWidth={1.6}/></span>
      </div>
    </div>
    <div className="flex flex-1 flex-col px-4 pb-4">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Monthly rent</p><p className="mt-0.5 text-2xl font-extrabold tabular-nums tracking-tight text-slate-950">₱{room.price.toLocaleString()}<span className="ml-1 text-xs font-medium text-slate-500">/month</span></p></div>
        <span className={`mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyles[room.status]||statusStyles.Occupied}`}><span className={`h-1.5 w-1.5 rounded-full ${isAvailable?'bg-emerald-500':'bg-current opacity-60'}`}/>{room.status}</span>
      </div>
      <div className="mt-3 flex items-center gap-2 border-y border-slate-100 py-2.5 text-xs font-medium text-slate-600"><UsersRound size={15} className="text-blue-600"/>Good for {room.capacity||"2–3"} {Number(room.capacity)===1?'person':'people'}</div>
      <p className="mt-3 line-clamp-3 min-h-[60px] text-sm leading-5 text-slate-600">{room.description||"Contact management for complete room details."}</p>
      <button type="button" disabled={!isAvailable} onClick={()=>isAvailable&&onInquire(room)} className={`mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${isAvailable?"bg-blue-600 text-white shadow-sm hover:bg-blue-700":"cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-500"}`}><MessageCircle size={17} strokeWidth={1.8}/>{isAvailable?"Inquire about this room":room.status}</button>
    </div>
  </article>;
}

export default RoomCard;
