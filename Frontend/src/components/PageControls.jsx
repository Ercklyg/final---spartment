export default function PageControls({offset,limit,total,onChange,disabled=false}) {
  return <nav aria-label="Record pages" aria-busy={disabled} className="flex flex-wrap items-center justify-end gap-2 px-4 py-3 text-sm text-slate-600 sm:gap-3 sm:px-5">
    <span aria-live="polite" className="mr-auto tabular-nums">{total?offset+1:0}–{Math.min(offset+limit,total)} of {total}</span>
    <button type="button" disabled={disabled||offset===0} onClick={()=>onChange(Math.max(0,offset-limit))} className="min-h-11 rounded-lg border px-3 disabled:opacity-40">Previous</button>
    <button type="button" disabled={disabled||offset+limit>=total} onClick={()=>onChange(offset+limit)} className="min-h-11 rounded-lg border px-3 disabled:opacity-40">Next</button>
  </nav>;
}
