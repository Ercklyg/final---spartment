import { ArrowLeft } from "lucide-react";

export default function FormHeader({ icon: Icon, iconClass, title, subtitle, onBack, trailing }) {
  return <div className="mb-4 flex items-center gap-3 border-b border-slate-200/80 pb-3">
    <button type="button" onClick={onBack} aria-label="Back to menu" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"><ArrowLeft size={17}/></button>
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${iconClass}`}><Icon size={18}/></span>
    <div className="min-w-0 flex-1"><h3 className="text-sm font-bold text-slate-900">{title}</h3><p className="mt-0.5 text-xs leading-4 text-slate-500">{subtitle}</p></div>
    {trailing}
  </div>;
}
