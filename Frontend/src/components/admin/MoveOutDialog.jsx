import { useEffect, useRef, useState } from "react";
import { LogOut, X } from "lucide-react";
import { today } from "../../lib/billing.js";

const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm";

export default function MoveOutDialog({ tenant, onClose, onDone }) {
  const dialog = useRef(null);
  const [date, setDate] = useState(() => today());
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [opId] = useState(() => crypto.randomUUID());
  const balance = Number(tenant.billing?.balance || 0);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current.showModal();
    return () => previous?.focus();
  }, []);
  const submit = async event => {
    event.preventDefault();
    if (saving) return;
    if (!date) return setError("Select an effective date.");
    if (tenant.moveIn && date < tenant.moveIn) return setError("Effective date cannot be before the move-in date (" + tenant.moveIn + ").");
    if (date > today()) return setError("Effective date cannot be in the future.");
    if (balance > 0 && !confirmed) return setError("Confirm that the outstanding balance stays on record.");
    setSaving(true);
    setError("");
    try {
      await onDone({ id: opId, date });
      onClose();
    } catch (submitError) {
      setError(submitError.message || "Unable to record the move-out.");
    } finally {
      setSaving(false);
    }
  };
  return <dialog ref={dialog} onCancel={event => { if (saving) event.preventDefault(); else onClose(); }} aria-labelledby="move-out-title" className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-950/40">
    <form onSubmit={submit}><fieldset disabled={saving}>
      <div className="flex items-start justify-between gap-3"><div><h2 id="move-out-title" className="text-xl font-bold">Move out tenant</h2><p className="mt-1 text-sm text-slate-500">{tenant.name} · Room {tenant.room}</p></div><button type="button" disabled={saving} onClick={onClose} aria-label="Close move out" className="p-2"><X /></button></div>
      <p className="mt-4 text-sm text-slate-600">This ends the active lease on the effective date and frees the room. Bills, payments and lease history stay on record, and the tenant keeps their login.</p>
      <label className="mt-4 block text-sm font-medium text-slate-700">Effective date<input required type="date" value={date} onChange={e => { setDate(e.target.value); setError(""); }} min={tenant.moveIn || undefined} max={today()} className={inputClass} /></label>
      {balance > 0 && <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"><input type="checkbox" checked={confirmed} onChange={e => { setConfirmed(e.target.checked); setError(""); }} className="mt-1" /><span><strong>Outstanding balance of {balance.toLocaleString("en-PH", { style: "currency", currency: "PHP" })} stays on record.</strong><span className="mt-1 block text-slate-600">The tenant moves out owing this amount. Confirm to continue.</span></span></label>}
      {error && <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}
      <button className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 font-semibold text-white disabled:opacity-60"><LogOut size={17} />{saving ? "Recording move-out..." : "Record move-out"}</button>
    </fieldset></form>
  </dialog>;
}
