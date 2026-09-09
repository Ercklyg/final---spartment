import { ArrowLeft, Send } from "lucide-react";
import { useState } from "react";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10";
const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";

function MaintenanceForm({ onBack }) {
  const [formData, setFormData] = useState({
    roomNumber: "",
    issue: "",
    description: "",
  });

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    console.log("Maintenance request:", formData);
  }

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
          Priority
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
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
      </form>
    </div>
  );
}

export default MaintenanceForm;
