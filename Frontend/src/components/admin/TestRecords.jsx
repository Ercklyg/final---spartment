export function TestBadge() {
  return <span className="ml-2 inline-flex rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">Test</span>;
}

export function TestRecordToggle({ checked, onChange }) {
  return <div className="my-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-600">
    <label className="inline-flex cursor-pointer items-center gap-2 font-medium"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="h-4 w-4 accent-violet-600"/>Show test records</label>
    <span className="text-xs">Operational totals exclude test records.</span>
  </div>;
}
