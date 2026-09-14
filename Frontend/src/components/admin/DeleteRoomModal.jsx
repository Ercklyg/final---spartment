import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";

export default function DeleteRoomModal({ room, onClose, onDelete }) {
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function remove(event) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      await onDelete(room[5]);
      onClose();
    } catch (error) {
      setError(error.message || "Unable to delete room.");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return <div role="dialog" aria-modal="true" aria-labelledby="delete-room-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4">
    <form onSubmit={remove} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
      <h2 id="delete-room-title" className="text-xl font-bold">Delete room {room[0]}?</h2>
      <p className="mt-3 text-sm text-slate-600">This permanently removes {room[4]} / Room {room[0]} from your room listings. This cannot be undone.</p>
      <p className="mt-2 text-sm text-slate-500">Rooms linked to tenants, leases, or requests cannot be deleted.</p>
      {error && <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p>}
      <fieldset disabled={saving} className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">Cancel</button>
        <button type="submit" className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Trash2 size={16} />{saving ? "Deleting..." : "Delete room"}</button>
      </fieldset>
    </form>
  </div>;
}
