import { api } from "../../lib/api.js";
import { submitTenantRequest } from "../../lib/requests.js";

import { ArrowLeft, Send } from "lucide-react";
import { useRef, useState } from "react";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10";
const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";

function MaintenanceForm({ onBack, prefilledRoom = "" }) {

  const busy=useRef(false); const attempt=useRef(null); const [saving,setSaving]=useState(false); const [submitError,setSubmitError]=useState(""); const [sent,setSent]=useState(false);
  const [formData, setFormData] = useState({
    roomNumber: prefilledRoom,
    issue: "",
    description: "",
    priority: "Normal",
  });

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if(busy.current)return;
    busy.current=true;setSaving(true);setSubmitError("");
    const signature=JSON.stringify(formData);if(attempt.current?.signature!==signature)attempt.current={signature,id:crypto.randomUUID()};
    try{await submitTenantRequest(api,'maintenance',formData,attempt.current.id);setSent(true);}catch(error){setSubmitError(error.message);}finally{busy.current=false;setSaving(false);}
  }

  if(sent)return <div role="status" className="p-5"><h3 className="font-bold">Request submitted</h3><p className="mt-2 text-sm">Your message has been saved for the administrator.</p><button type="button" onClick={onBack} className="mt-4 text-blue-600 underline">Back to menu</button></div>;
  return (
    <div className="flex flex-col p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to menu"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900">
            Maintenance Request
          </h3>
          <p className="truncate text-xs text-slate-500">
            We&apos;ll forward this to building admin
          </p>
        </div>
        <span className="ml-auto shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
          {formData.priority} priority
        </span>
      </div>

      <form onSubmit={handleSubmit}><fieldset disabled={saving} className="flex flex-col gap-3.5">
        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="roomNumber" className={labelClass}>
              Room number
            </label>
            <input
              id="roomNumber"
              name="roomNumber"
              type="text"
              required
              readOnly={Boolean(prefilledRoom)}
              placeholder="e.g. 204"
              value={formData.roomNumber}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="issue" className={labelClass}>
              Issue type
            </label>
            <input
              id="issue"
              name="issue"
              type="text"
              required
              placeholder="Leaking faucet"
              value={formData.issue}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-slate-700">Maintenance priority</legend>
          <div className="flex flex-wrap gap-2">
            {[['Normal', 'Routine repair', 'bg-slate-100 text-slate-800 border-slate-400'], ['High', 'Needs prompt attention', 'bg-orange-50 text-orange-800 border-orange-400'], ['Urgent', 'Immediate attention needed', 'bg-rose-50 text-rose-800 border-rose-400']].map(([level, description, color]) => (
              <label key={level} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${formData.priority === level ? color : 'border-slate-300 bg-white text-slate-700'}`}>
                <input type="radio" name="priority" value={level} checked={formData.priority === level} onChange={handleChange} aria-description={description} className="h-4 w-4 accent-blue-600"/>
                {level}
              </label>
            ))}
          </div>
          <p className="mt-2 text-sm text-slate-600">{formData.priority === 'Normal' ? 'Routine repairs that can be scheduled.' : formData.priority === 'High' ? 'A problem affecting daily use that needs prompt attention.' : 'A serious issue needing immediate attention. For immediate danger, contact emergency services and building staff directly; do not wait for chat.'}</p>
        </fieldset>

        <div>
          <label htmlFor="description" className={labelClass}>
            Describe the problem
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            required
            placeholder="Where is it, when did it start, how urgent is it…"
            value={formData.description}
            onChange={handleChange}
            className="min-h-[110px] w-full resize-none rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
          />
        </div>

        <button
          type="submit"
          className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(37,99,235,0.5)] transition hover:bg-blue-700 active:scale-[0.99]"
        >
          <Send size={16} />
          Submit request
        </button>
      {submitError&&<p role="alert" className="text-sm text-rose-700">{submitError}</p>}{saving&&<p role="status" className="text-sm">Submitting...</p>}</fieldset></form>
    </div>
  );
}

export default MaintenanceForm;
