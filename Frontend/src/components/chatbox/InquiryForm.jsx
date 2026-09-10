
import { ArrowLeft, Send } from "lucide-react";
import { useEffect, useState } from "react";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10";
const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";

// Local YYYY-MM-DD so the native date picker disables already-passed days.
const todayString = new Date().toLocaleDateString("en-CA");

function InquiryForm({ onBack, prefilledRoom = "" }) {
  const isPreferredRoomLocked = Boolean(prefilledRoom);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    contact: "",
    preferredRoom: prefilledRoom,
    moveInDate: "",
    message: "",
  });


  useEffect(() => {
    if (!prefilledRoom) return;
    setFormData(previous => previous.preferredRoom === prefilledRoom ? previous : { ...previous, preferredRoom: prefilledRoom });
  }, [prefilledRoom]);

  const [dateError, setDateError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    if (name === "moveInDate" && value >= todayString) {
      setDateError("");
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (formData.moveInDate && formData.moveInDate < todayString) {
      setDateError("Please choose today or a future date.");
      return;
    }
    setDateError("");
    console.log("Inquiry submitted:", formData);
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
          <h3 className="text-sm font-bold text-slate-900">Unit Inquiry</h3>
          <p className="truncate text-xs text-slate-500">
            Tell us what you&apos;re looking for
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div>
          <label htmlFor="fullName" className={labelClass}>
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            placeholder="Juan Dela Cruz"
            value={formData.fullName}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label htmlFor="inquiryEmail" className={labelClass}>
              Email
            </label>
            <input
              id="inquiryEmail"
              name="email"
              type="email"
              required
              placeholder="you@email.com"
              value={formData.email}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="contact" className={labelClass}>
              Contact number
            </label>
            <input
              id="contact"
              name="contact"
              type="tel"
              placeholder="09xx xxx xxxx"
              value={formData.contact}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="preferredRoom" className={labelClass}>
              Preferred room
            </label>
            <input
              id="preferredRoom"
              name="preferredRoom"
              type="text"
              placeholder="e.g. 102"
              value={formData.preferredRoom}
              onChange={isPreferredRoomLocked ? undefined : handleChange}
              readOnly={isPreferredRoomLocked}
              aria-readonly={isPreferredRoomLocked}
              title={
                isPreferredRoomLocked
                  ? "This room was selected from the listing and cannot be changed."
                  : undefined
              }
              className={`${inputClass} ${
                isPreferredRoomLocked
                  ? "cursor-not-allowed bg-slate-100 text-slate-600"
                  : ""
              }`}
            />
          </div>
          <div>
            <label htmlFor="moveInDate" className={labelClass}>
              Move-in date
            </label>
            <input
              id="moveInDate"
              name="moveInDate"
              type="date"
              min={todayString}
              value={formData.moveInDate}
              onChange={handleChange}
              className={`${inputClass} text-slate-600`}
            />
            {dateError && (
              <p className="mt-1.5 text-xs font-medium text-red-600">
                {dateError}
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="inquiryMessage" className={labelClass}>
            Message
          </label>
          <textarea
            id="inquiryMessage"
            name="message"
            rows={3}
            placeholder="Anything we should know? Budget, occupants, preferred floor…"
            value={formData.message}
            onChange={handleChange}
            className="min-h-[88px] w-full resize-none rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
          />
        </div>

        <button
          type="submit"
          className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(37,99,235,0.5)] transition hover:bg-blue-700 active:scale-[0.99]"
        >
          <Send size={16} />
          Send inquiry
        </button>
      </form>
    </div>
  );
}

export default InquiryForm;
