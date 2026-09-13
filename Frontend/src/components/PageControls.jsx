export default function PageControls({offset,limit,total,onChange,disabled=false}) {
  return <nav aria-label="Record pages" className="flex items-center justify-end gap-3 px-5 py-3 text-sm text-slate-600">
    <span>{total?offset+1:0}–{Math.min(offset+limit,total)} of {total}</span>
    <button type="button" disabled={disabled||offset===0} onClick={()=>onChange(Math.max(0,offset-limit))} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Previous</button>
    <button type="button" disabled={disabled||offset+limit>=total} onClick={()=>onChange(offset+limit)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Next</button>
  </nav>;
}
