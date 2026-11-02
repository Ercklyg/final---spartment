import { Building2, CheckCircle2, MessageCircle, Ruler, UsersRound, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { closeFromBackdrop } from "../../lib/dialog.js";

export default function RoomDetailsDialog({ room, onClose, onInquire }) {
  const dialog=useRef(null);
  useEffect(()=>{const previous=document.activeElement;dialog.current.showModal();return()=>previous?.focus();},[]);
  const available=room.status==="Available";
  return <dialog ref={dialog} onCancel={event=>{event.preventDefault();onClose();}} onMouseDown={event=>closeFromBackdrop(event,onClose)} aria-labelledby="room-details-title" className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/45">
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-800 via-blue-600 to-cyan-500 px-5 py-6 text-white sm:px-6">
      <div className="pointer-events-none absolute -right-8 -top-14 h-40 w-40 rounded-full border-[26px] border-white/10"/>
      <div className="relative flex items-start justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">{room.building}</p><h2 id="room-details-title" className="mt-1 text-2xl font-extrabold tracking-tight">{room.name}</h2><p className="mt-1 text-sm text-white/80">Floor {room.floor} · {room.size}</p></div><button type="button" onClick={onClose} aria-label="Close room details" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20"><X size={19}/></button></div>
    </div>
    <div className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Monthly rent</p><p className="mt-1 text-3xl font-extrabold tabular-nums tracking-tight text-slate-950">₱{room.price.toLocaleString()}<span className="ml-1 text-sm font-medium text-slate-500">/month</span></p></div><span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${available?'border-emerald-200 bg-emerald-50 text-emerald-700':'border-slate-200 bg-slate-100 text-slate-600'}`}><CheckCircle2 size={14}/>{room.status}</span></div>
      <div className="mt-5 grid grid-cols-3 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-slate-50 py-3 text-center">
        <div className="px-2"><Building2 size={17} className="mx-auto text-blue-600"/><p className="mt-1 text-[11px] text-slate-500">Floor</p><p className="text-sm font-bold text-slate-800">{room.floor}</p></div>
        <div className="px-2"><Ruler size={17} className="mx-auto text-blue-600"/><p className="mt-1 text-[11px] text-slate-500">Size</p><p className="text-sm font-bold text-slate-800">{room.size}</p></div>
        <div className="px-2"><UsersRound size={17} className="mx-auto text-blue-600"/><p className="mt-1 text-[11px] text-slate-500">Capacity</p><p className="text-sm font-bold text-slate-800">{room.capacity||"2–3"} people</p></div>
      </div>
      <div className="mt-5"><h3 className="text-sm font-bold text-slate-900">About this room</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{room.description||"Contact management for complete room details."}</p></div>
      <button type="button" disabled={!available} onClick={()=>available&&onInquire(room)} className={`mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold shadow-sm ${available?'bg-blue-600 text-white hover:bg-blue-700':'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-500'}`}><MessageCircle size={18}/>{available?'Inquire about this room':room.status}</button>
    </div>
  </dialog>;
}
