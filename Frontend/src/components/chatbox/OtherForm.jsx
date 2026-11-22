import { api } from "../../lib/api.js";
import { submitGuestMessage, submitTenantRequest } from "../../lib/requests.js";

import { MessagesSquare, Send } from "lucide-react";
import { useRef, useState } from "react";
import FormHeader from "./FormHeader.jsx";
import SubmissionSuccess from "./SubmissionSuccess.jsx";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10";
const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";

function OtherForm({ onBack, guest = true }) {

  const busy=useRef(false); const attempt=useRef(null); const [saving,setSaving]=useState(false); const [submitError,setSubmitError]=useState(""); const [sent,setSent]=useState(false);
  const [formData, setFormData] = useState({
    fullName: "", email: "", contact: "",
    subject: "",
    message: "",
  });

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: name === "contact" ? value.replace(/\D/g, "").slice(0, 11) : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (guest && !formData.email.trim() && !formData.contact.trim()) {
      setSubmitError("Provide an email address or contact number so management can respond.");
      return;
    }
    if(busy.current)return;
    busy.current=true;setSaving(true);setSubmitError("");
    const signature=JSON.stringify(formData);if(attempt.current?.signature!==signature)attempt.current={signature,id:crypto.randomUUID()};
    try{if(guest)await submitGuestMessage(api,formData,attempt.current.id);else await submitTenantRequest(api,'other',{subject:formData.subject,message:formData.message},attempt.current.id);setSent(true);}catch(error){setSubmitError(error.message);}finally{busy.current=false;setSaving(false);}
  }

  if(sent)return <SubmissionSuccess title="Request submitted" message="Your message has been saved for the administrator." onBack={onBack}/>;
  return (
    <div className="flex flex-col p-4">
      <FormHeader icon={MessagesSquare} iconClass="border-violet-100 bg-violet-50 text-violet-600" title="General Message" subtitle="Anything else — we’re listening" onBack={onBack}/>

      <form onSubmit={handleSubmit}><fieldset disabled={saving} className="flex flex-col gap-3.5">
        {guest && <>
          <div><label htmlFor="guestMessageName" className={labelClass}>Full name</label><input id="guestMessageName" name="fullName" autoComplete="name" required maxLength={160} value={formData.fullName} onChange={handleChange} className={inputClass}/></div>
          <p id="guestContactHelp" className="text-xs text-slate-500">Provide an email address or contact number so management can respond. You may provide both.</p>
          <div><label htmlFor="guestMessageEmail" className={labelClass}>Email address</label><input id="guestMessageEmail" name="email" type="email" autoComplete="email" maxLength={254} aria-describedby="guestContactHelp" value={formData.email} onChange={handleChange} className={inputClass}/></div>
          <div><label htmlFor="guestMessagePhone" className={labelClass}>Contact number</label><input id="guestMessagePhone" name="contact" type="tel" inputMode="numeric" autoComplete="tel" maxLength={11} pattern="[0-9]{1,11}" aria-describedby="guestContactHelp" value={formData.contact} onChange={handleChange} className={inputClass}/></div>
        </>}
        <div>
          <label htmlFor="subject" className={labelClass}>
            Subject
          </label>
          <input
            id="subject"
            name="subject"
            type="text"
            maxLength={160}
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
            maxLength={4000}
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
          {saving ? "Submitting…" : "Send message"}
        </button>
      {submitError&&<p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-700">{submitError}</p>}</fieldset></form>
    </div>
  );
}

export default OtherForm;
