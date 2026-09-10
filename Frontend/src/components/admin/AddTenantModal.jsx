import { useEffect, useRef, useState } from "react";
import { Copy, Eye, EyeOff, Plus, X } from "lucide-react";

const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm";
const makePassword = () => "Defaultpass@123";

export default function AddTenantModal({ onClose, onAdd, existingTenants = [] }) {
  const dialog = useRef(null);
  const [form, setForm] = useState(() => ({
    name: "", email: "", phone: "", room: "", moveIn: "", rent: "6500",
    emergencyName: "", emergencyPhone: "", relationship: "", address: "",
    leaseEnd: "", password: makePassword(),
  }));
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current.showModal();
    return () => previous?.focus();
  }, []);
  const change = (key, value) => { setForm(old => ({ ...old, [key]: value })); setError(""); setNotice(""); };
  const submit = event => {
    event.preventDefault();
    const account = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, key === "password" ? value : value.trim()]));
    if (!account.name || !account.room || !account.emergencyName || !account.relationship) return setError("Complete all required information.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)) return setError("Enter a valid email address.");
    if (![account.phone, account.emergencyPhone].every(value => /^\+?[\d\s()-]{7,20}$/.test(value))) return setError("Enter valid tenant and emergency phone numbers.");
    if (existingTenants.some(t => t.email.toLowerCase() === account.email.toLowerCase())) return setError("This email already belongs to a tenant.");
    if (existingTenants.some(t => t.room.toLowerCase() === account.room.toLowerCase())) return setError("This room is already assigned to a tenant.");
    if (!Number.isFinite(Number(account.rent)) || Number(account.rent) <= 0) return setError("Monthly rent must be greater than zero.");
    if (account.leaseEnd && account.leaseEnd < account.moveIn) return setError("Lease end cannot be before the move-in date.");
    if (account.password.length < 8) return setError("Use at least 8 characters for the temporary password.");
    onAdd?.({ ...account, id: crypto.randomUUID(), email: account.email.toLowerCase(), rent: Number(account.rent), role: "Tenant", status: "Active", temporaryPassword: true });
    onClose();
  };
  const fields = (items) => items.map(([key, label, type, optional]) => <label key={key} className="text-sm font-medium text-slate-700">{label}{optional ? " (optional)" : ""}<input required={!optional} type={type} value={form[key]} onChange={e => change(key,e.target.value)} min={key === "rent" ? "0.01" : undefined} step={key === "rent" ? "0.01" : undefined} autoComplete={key === "email" ? "off" : undefined} className={inputClass}/></label>);
  return <dialog ref={dialog} onCancel={onClose} aria-labelledby="add-tenant-title" className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-950/40">
    <form onSubmit={submit}>
      <div className="flex items-start justify-between gap-3"><div><h2 id="add-tenant-title" className="text-xl font-bold">Add tenant</h2><p className="mt-1 text-sm text-slate-500">Create the tenant account and record their tenancy details.</p></div><button type="button" onClick={onClose} aria-label="Close add tenant" className="p-2"><X/></button></div>
      <h3 className="mt-5 font-semibold">Personal information</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">{fields([["name","Full name","text"],["email","Email / sign-in address","email"],["phone","Phone number","tel"],["address","Previous address","text",true]])}</div>
      <h3 className="mt-5 font-semibold">Tenancy information</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">{fields([["room","Assigned room","text"],["rent","Monthly rent (PHP)","number"],["moveIn","Move-in date","date"],["leaseEnd","Lease end date","date",true]])}</div>
      <h3 className="mt-5 font-semibold">Emergency contact</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">{fields([["emergencyName","Contact full name","text"],["emergencyPhone","Contact phone number","tel"],["relationship","Relationship to tenant","text"]])}</div>
      <section className="mt-5 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
        <h3 className="font-semibold">Account access</h3><p className="mt-1 text-sm text-slate-600">Role: Tenant · Account status: Active</p>
        <label className="mt-3 block text-sm font-medium" htmlFor="temporary-password">Default temporary password</label>
        <div className="flex items-center gap-2"><input id="temporary-password" required minLength={8} autoComplete="new-password" type={visible ? "text" : "password"} value={form.password} readOnly className={inputClass}/><button type="button" onClick={()=>setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"} className="mt-1.5 rounded-lg border border-slate-200 bg-white p-3">{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button><button type="button" aria-label="Copy password" onClick={async()=>{try {await navigator.clipboard.writeText(form.password);setNotice("Password copied.");} catch {setError("Could not copy. Reveal the password to copy it manually.");}}} className="mt-1.5 rounded-lg border border-slate-200 bg-white p-3"><Copy size={18}/></button></div>
        <p className="mt-2 text-sm text-slate-600">The default temporary password is filled in automatically. Share it privately with the tenant and ask them to change it after their first sign-in.</p>
      </section>
      {error&&<p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}{notice&&<p role="status" className="mt-3 text-sm text-emerald-700">{notice}</p>}
      <button className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white"><Plus size={17}/>Create tenant account</button>
    </form>
  </dialog>;
}
