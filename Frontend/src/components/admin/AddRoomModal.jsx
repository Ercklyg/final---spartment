import { useRef, useState } from "react";
import { Plus, Save, X } from "lucide-react";

function AddRoomModal({ onClose, onAdd, initialRoom }) {
  const editing = Boolean(initialRoom);
  const [form, setForm] = useState(() => initialRoom || {
    room: "", building: "Main Building", floor: "1", size: "8",
    rate: "6500", capacity: "2-3", notes: "",
  });
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const update = (key, value) => { setForm({ ...form, [key]: value }); setError(""); };
  const submit = async (event) => {
    event.preventDefault();
    if (busy.current) return;
    if (!/^\d{3,}$/.test(form.room)) return setError("Enter a valid room number (at least 3 digits).");
    if (!form.building.trim()) return setError("Building name is required.");
    if (!Number.isInteger(Number(form.floor)) || Number(form.floor) < 1 || Number(form.floor) > 1000) return setError("Floor must be a whole number between 1 and 1000.");
    if (!Number.isFinite(Number(form.size)) || Number(form.size) < 8 || Number(form.size) > 14) return setError("Room size must be between 8 and 14 sqm.");
    if (!["2", "3", "2-3"].includes(form.capacity)) return setError("Capacity must be 2, 3, or 2-3 persons.");
    if (!Number.isFinite(Number(form.rate)) || Number(form.rate) <= 0) return setError("Monthly rate must be greater than zero.");
    busy.current = true;
    setSaving(true);
    try {
      await onAdd({ ...form, floor: Number(form.floor), rate: Number(form.rate), size: Number(form.size) });
      onClose();
    } catch (error) {
      setError(error.message || "Unable to save room.");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  return <div role="dialog" aria-modal="true" aria-labelledby="room-modal-title" className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4">
    <form onSubmit={submit} className="my-4 w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
      <div className="flex items-center justify-between">
        <div><h2 id="room-modal-title" className="text-xl font-bold">{editing ? "Edit room" : "Add room"}</h2><p className="mt-1 text-sm text-slate-500">Enter the room details and location.</p></div>
        <button disabled={saving} type="button" onClick={onClose} aria-label="Close room form" className="rounded-lg p-2"><X /></button>
      </div>
      <fieldset disabled={saving}>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[["room", "Room number", "e.g. 211"], ["building", "Building", "e.g. Main Building"], ["floor", "Floor", "e.g. 3"], ["size", "Size (sqm)", "8-14 sqm"], ["rate", "Monthly rate", "e.g. 6500"], ["capacity", "Capacity (persons)", "2-3"]].map(([key, label, placeholder]) =>
            <label key={key} className="text-sm font-medium text-slate-700">{label}
              <input value={form[key]} onChange={(e) => update(key, e.target.value)} required
                type={["floor", "size", "rate"].includes(key) ? "number" : "text"}
                min={key === "floor" ? "1" : key === "size" ? "8" : key === "rate" ? "0.01" : undefined}
                max={key === "size" ? "14" : key === "floor" ? "1000" : undefined}
                step={key === "size" || key === "rate" ? "0.01" : undefined}
                maxLength={key === "room" ? 40 : key === "building" ? 160 : undefined}
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" placeholder={placeholder} />
            </label>)}
        </div>
        {editing && <p className="mt-3 text-xs text-slate-500">Changing the listing rate does not change an existing tenant&apos;s lease rent.</p>}
        <label className="mt-4 block text-sm font-medium text-slate-700">Room description &amp; amenities
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} maxLength={4000} className="mt-1.5 min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="e.g. Private bathroom, compact kitchenette, double-deck bed, and storage." />
        </label>
        {error && <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}
        <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-50">
          {editing ? <Save size={17} /> : <Plus size={17} />}{saving ? "Saving..." : editing ? "Save changes" : "Add available room"}
        </button>
      </fieldset>
    </form>
  </div>;
}

export default AddRoomModal;
