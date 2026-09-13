import { api } from "../../lib/api.js";
import { submitTenantRequest } from "../../lib/requests.js";

import { ArrowLeft, Send } from "lucide-react";
import { useRef, useState } from "react";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10";
const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";

function OtherForm({ onBack }) {

  const busy=useRef(false); const attempt=useRef(null); const [saving,setSaving]=useState(false); const [submitError,setSubmitError]=useState(""); const [sent,setSent]=useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
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
    try{await submitTenantRequest(api,'other',formData,attempt.current.id);setSent(true);}catch(error){setSubmitError(error.message);}finally{busy.current=false;setSaving(false);}
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
          <h3 className="text-sm font-bold text-slate-900">General Message</h3>
          <p className="truncate text-xs text-slate-500">
            Anything else — we&apos;re listening
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}><fieldset disabled={saving} className="flex flex-col gap-3.5">
        <div>
          <label htmlFor="subject" className={labelClass}>
            Subject
          </label>
          <input
            id="subject"
            name="subject"
            type="text"
            required
            placeholder="e.g. Gate access, visitor pass, billing…"
            value={formData.subject}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="otherMessage" className={labelClass}>
            Message
          </label>
          <textarea
            id="otherMessage"
            name="message"
            rows={5}
            required
            placeholder="Write your message here…"
            value={formData.message}
            onChange={handleChange}
            className="min-h-[140px] w-full resize-none rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
          />
        </div>

        <button
          type="submit"
          className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(37,99,235,0.5)] transition hover:bg-blue-700 active:scale-[0.99]"
        >
          <Send size={16} />
          Send message
        </button>
      {submitError&&<p role="alert" className="text-sm text-rose-700">{submitError}</p>}{saving&&<p role="status" className="text-sm">Submitting...</p>}</fieldset></form>
    </div>
  );
}

export default OtherForm;
