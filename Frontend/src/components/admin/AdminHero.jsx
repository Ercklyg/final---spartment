import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Hand } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const monthValue=(year,index)=>`${year}-${String(index+1).padStart(2,"0")}`;

function MonthTrigger({ monthLabel, open=false }) {
  return <span aria-hidden="true" className={`flex w-full items-center gap-3 rounded-xl border bg-white px-4 py-2.5 text-left shadow-sm transition sm:min-w-52 ${open?"border-blue-500 ring-4 ring-blue-100":"border-slate-200 hover:border-blue-300 hover:bg-blue-50/30"}`}><CalendarDays size={19} className="text-blue-600"/><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{monthLabel}</span><span className="block text-[11px] text-slate-500">Reporting month</span></span><ChevronDown size={17} className={`transition-transform ${open?"rotate-180":""}`}/></span>;
}

function AdminHero({ selectedMonth, onMonthChange }) {
  const [year,selectedMonthNumber]=selectedMonth.split("-").map(Number);
  const [open,setOpen]=useState(false);
  const [shownYear,setShownYear]=useState(year);
  const picker=useRef(null);
  const monthLabel=new Intl.DateTimeFormat("en-PH",{month:"long",year:"numeric"}).format(new Date(selectedMonth+"-01T12:00:00"));
  useEffect(()=>{
    if(!open)return;
    const close=event=>{if(!picker.current?.contains(event.target))setOpen(false);};
    const escape=event=>{if(event.key==="Escape")setOpen(false);};
    document.addEventListener("pointerdown",close);document.addEventListener("keydown",escape);
    return()=>{document.removeEventListener("pointerdown",close);document.removeEventListener("keydown",escape);};
  },[open]);
  const choose=value=>{onMonthChange(value);setOpen(false);};
  const current=new Date(), currentValue=monthValue(current.getFullYear(),current.getMonth());
  return <section className="flex flex-col justify-between gap-4 py-6 md:flex-row md:items-center md:py-8">
    <div><p className="text-xs font-semibold tracking-wide text-slate-500 sm:text-sm">DASHBOARD</p><h1 className="mt-1 flex items-center gap-2 text-[28px] font-extrabold leading-tight tracking-[-0.045em] sm:text-[38px]">Good morning, Admin <Hand size={28} className="shrink-0 text-amber-500" aria-hidden="true" /></h1><p className="mt-1 text-sm leading-5 text-slate-500 sm:text-lg">Here&apos;s what needs your attention across the property today.</p></div>
    <label className="relative block w-full cursor-pointer rounded-xl focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-600 sm:hidden"><MonthTrigger monthLabel={monthLabel}/><input type="month" value={selectedMonth} onChange={event=>{if(event.target.value)onMonthChange(event.target.value);}} aria-label="Dashboard month filter" className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"/></label>
    <div ref={picker} className="relative hidden sm:block">
      <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={()=>{if(!open)setShownYear(year);setOpen(value=>!value);}} className="rounded-xl text-left"><MonthTrigger monthLabel={monthLabel} open={open}/></button>
      {open&&<div role="dialog" aria-label="Choose reporting month" className="absolute right-0 z-40 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_20px_55px_-18px_rgba(15,23,42,0.35)]">
        <div className="flex items-center justify-between px-1 pb-3"><button type="button" onClick={()=>setShownYear(value=>value-1)} aria-label="Previous year" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"><ChevronLeft size={18}/></button><strong className="text-sm text-slate-900">{shownYear}</strong><button type="button" onClick={()=>setShownYear(value=>value+1)} aria-label="Next year" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"><ChevronRight size={18}/></button></div>
        <div className="grid grid-cols-4 gap-1.5">{months.map((label,index)=>{const value=monthValue(shownYear,index),selected=shownYear===year&&index===selectedMonthNumber-1,today=value===currentValue;return <button key={label} type="button" onClick={()=>choose(value)} aria-pressed={selected} className={`relative min-h-10 rounded-lg text-xs font-semibold transition ${selected?"bg-blue-600 text-white shadow-sm":"text-slate-600 hover:bg-blue-50 hover:text-blue-700"}`}>{label}{today&&!selected&&<span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-blue-500"/>}</button>;})}</div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3"><button type="button" onClick={()=>setShownYear(year)} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100">Selected year</button><button type="button" onClick={()=>choose(currentValue)} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100">This month</button></div>
      </div>}
    </div>
  </section>;
}
export default AdminHero;
