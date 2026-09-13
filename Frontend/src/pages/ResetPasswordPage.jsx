import PageSkeleton from "../components/PageSkeleton.jsx";
import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { auth } from '../lib/api.js';
import { beginRecovery, clearRecovery, saveRecoveredPassword } from '../lib/passwordRecovery.js';
import ForgotPasswordForm from '../components/landing/ForgotPasswordForm.jsx';

export default function ResetPasswordPage() {
  const [recovery, setRecovery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState('');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const busy = useRef(false);
  useEffect(() => {
    let active = true;
    beginRecovery().then(value => { if (active) setRecovery(value); })
      .catch(e => { if (active) setInvalid(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!recovery || done) return;
    const timer = setTimeout(() => { clearRecovery(); setInvalid('Your reset session has expired. Request a new link.'); }, Math.max(0, recovery.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [recovery, done]);
  const goBack = () => { clearRecovery(); window.location.assign('/'); };
  const submit = async event => {
    event.preventDefault();
    if (busy.current || !recovery || invalid) return;
    if (password !== confirmPassword) { setError('Your passwords do not match.'); return; }
    busy.current = true; setSaving(true); setError('');
    try {
      await saveRecoveredPassword(recovery.ticket, password, confirmPassword);
      auth.clearLocalSession(); setDone(true); setPassword(''); setConfirmPassword('');
    } catch (e) {
      if (e.status === 401 || e.status === 403) { clearRecovery(); setInvalid(e.message); } else setError(e.message);
    } finally { busy.current = false; setSaving(false); }
  };
  return <main className="flex min-h-screen items-center justify-center bg-[#f6f9fd] px-5 py-12">
    <div className="w-full max-w-md"><p className="mb-6 text-sm font-bold uppercase tracking-[0.25em] text-blue-600">Spartment</p>
      {loading ? <PageSkeleton variant="password" label="Checking your reset link..."/> : done ? <section className="rounded-[26px] border border-slate-200 bg-white p-7 shadow-lg"><h1 className="text-2xl font-bold">Password reset</h1><p role="status" className="mt-3 text-slate-600">Your password has been updated. Sign in using your new password.</p><button onClick={goBack} className="mt-6 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white">Back to sign in</button></section>
        : invalid ? <><p role="alert" className="mb-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{invalid}</p><ForgotPasswordForm onBack={goBack} /></>
          : <form onSubmit={submit} className="space-y-5 rounded-[26px] border border-slate-200 bg-white p-7 shadow-lg">
            <div><LockKeyhole className="mb-3 text-blue-600" /><h1 className="text-3xl font-extrabold tracking-tight">Enter new password</h1><p className="mt-2 text-sm text-slate-500">Use 8–128 characters with uppercase and lowercase letters, a number, and a symbol.</p></div>
            <fieldset disabled={saving} className="space-y-4">
              {[['new-password', 'New password', password, setPassword], ['confirm-password', 'Confirm password', confirmPassword, setConfirmPassword]].map(([id, label, value, setValue]) => <label key={id} htmlFor={id} className="block text-sm font-semibold text-slate-800">{label}<input id={id} type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={128} required value={value} onChange={event => { setValue(event.target.value); setError(''); }} className="mt-2 h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" /></label>)}
              <button type="button" aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} className="flex items-center gap-2 text-sm text-slate-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}{showPassword ? 'Hide passwords' : 'Show passwords'}</button>
              {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
              <button className="h-14 w-full rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving password...' : 'Save new password'}</button>
              <button type="button" onClick={goBack} className="text-sm text-blue-600 hover:underline">Back to sign in</button>
            </fieldset>
          </form>}
    </div>
  </main>;
}
