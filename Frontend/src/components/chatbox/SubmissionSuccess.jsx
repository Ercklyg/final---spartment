import { CheckCircle2 } from "lucide-react";

export default function SubmissionSuccess({ title, message, onBack }) {
  return <div role="status" className="flex min-h-full flex-col items-center justify-center px-6 py-10 text-center">
    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-8 ring-emerald-50"><CheckCircle2 size={28}/></span>
    <h3 className="mt-5 text-lg font-bold text-slate-900">{title}</h3>
    <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">{message}</p>
    <button type="button" onClick={onBack} className="mt-6 inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">Back to menu</button>
  </div>;
}
