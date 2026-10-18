import { api } from "../../lib/api.js";
import { submitInquiry } from "../../lib/requests.js";

import { ArrowLeft, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10";
const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";

// Local YYYY-MM-DD so the native date picker disables already-passed days.
const now = new Date();
const todayString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const roomLabel = (room) => `${room.buildings?.name || "Building"} / Room ${room.room_number}`;

function InquiryForm({ onBack, prefilledRoom = "" }) {
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState("");
  const [roomsRevision, setRoomsRevision] = useState(0);

  const busy=useRef(false); const attempt=useRef(null); const [saving,setSaving]=useState(false); const [submitError,setSubmitError]=useState(""); const [sent,setSent]=useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    contact: "",
    preferredRoom: prefilledRoom,
    moveInDate: "",
    message: "",
  });
  useEffect(() => {
    let active = true;
    api.get("/public/rooms").then((data) => {
      if (!active) return;
      const availableRooms = data.filter((room) => room.status === "available");
      setRooms(availableRooms);
      setFormData((previous) => ({
        ...previous,
        preferredRoom: availableRooms.some((room) => roomLabel(room) === previous.preferredRoom)
          ? previous.preferredRoom : "",
      }));
    }).catch(() => {
      if (active) setRoomsError("Unable to load available rooms. Please try again.");
    }).finally(() => {
      if (active) setRoomsLoading(false);
    });
    return () => { active = false; };
  }, [roomsRevision]);

  function retryRooms() {
    setRoomsLoading(true);
    setRoomsError("");
    setRoomsRevision((previous) => previous + 1);
  }

  const [dateError, setDateError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    if (name === "moveInDate" && value && value < todayString) {
      setDateError("Please choose today or a future date.");
      return;
    }
    setFormData((previous) => ({ ...previous, [name]: value }));
    if (name === "moveInDate") {
      setDateError("");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (formData.moveInDate && formData.moveInDate < todayString) {
      setDateError("Please choose today or a future date.");
      return;
    }
    setDateError("");
    if(busy.current || roomsLoading || roomsError)return;
    busy.current=true;setSaving(true);setSubmitError("");
    const signature=JSON.stringify(formData);if(attempt.current?.signature!==signature)attempt.current={signature,id:crypto.randomUUID()};
    try {
      if (formData.preferredRoom) {
        const availableRooms = (await api.get("/public/rooms")).filter((room) => room.status === "available");
        setRooms(availableRooms);
        if (!availableRooms.some((room) => roomLabel(room) === formData.preferredRoom)) {
          setFormData((previous) => ({ ...previous, preferredRoom: "" }));
          throw new Error("That room is no longer available. Please choose another room.");
        }
      }
      await submitInquiry(api,formData,attempt.current.id);
      setSent(true);
    } catch(error) {
      setSubmitError(error.message);
    } finally {
      busy.current=false;
      setSaving(false);
    }
  }

  if(sent)return <div role="status" className="p-5"><h3 className="font-bold">Inquiry submitted</h3><p className="mt-2 text-sm">Your message has been saved for the administrator.</p><button type="button" onClick={onBack} className="mt-4 text-blue-600 underline">Back to menu</button></div>;
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

      <form onSubmit={handleSubmit}><fieldset disabled={saving} className="flex flex-col gap-3.5">
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

        <div className="grid grid-cols-1 gap-3.5">
          <div>
            <label htmlFor="preferredRoom" className={labelClass}>
              Preferred room
            </label>
            <select
              id="preferredRoom"
              name="preferredRoom"
              value={roomsLoading || roomsError ? "" : formData.preferredRoom}
              onChange={handleChange}
              disabled={roomsLoading || Boolean(roomsError) || rooms.length === 0}
              aria-describedby={roomsError ? "roomsError" : undefined}
              className={`${inputClass} min-w-0 disabled:bg-slate-100 disabled:text-slate-500`}
            >
              <option value="">
                {roomsLoading ? "Loading available rooms..." : roomsError ? "Rooms unavailable" : rooms.length === 0 ? "No rooms currently available" : "Any available room"}
              </option>
              {rooms.map((room) => (
                <option key={room.id} value={roomLabel(room)}>
                  {roomLabel(room)}
                </option>
              ))}
            </select>
            {roomsError && (
              <p id="roomsError" role="alert" className="mt-1.5 text-xs text-red-600">
                {roomsError}{" "}
                <button type="button" onClick={retryRooms} className="font-semibold underline">Retry</button>
              </p>
            )}
          </div>
          <div>
            <label htmlFor="moveInDate" className={labelClass}>
              Preferred move-in date (optional)
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
          disabled={roomsLoading || Boolean(roomsError)}
          className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(37,99,235,0.5)] transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={16} />
          Send inquiry
        </button>
      {submitError&&<p role="alert" className="text-sm text-rose-700">{submitError}</p>}{saving&&<p role="status" className="text-sm">Submitting...</p>}</fieldset></form>
    </div>
  );
}

export default InquiryForm;
