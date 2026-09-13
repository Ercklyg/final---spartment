import { useRef, useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { requestPasswordReset } from '../../lib/passwordRecovery.js';

export default function ForgotPasswordForm({ initialEmail = '', onBack }) {
  const [email, setEmail] = useState(initialEmail);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const busy = useRef(false);
  const submit = async event => {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true; setSaving(true); setError(''); setMessage('');
    try { const result = await requestPasswordReset(email.trim()); setMessage(result.message); }
    catch (e) { setError(e.message); }
    finally { busy.current = false; setSaving(false); }
  };
  return <div className="w-full max-w-[570px]">
    <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">Forgot password?</h2>
    <p className="mt-2 text-sm text-slate-500">Enter your registered email and we’ll send you a password reset link. Available for tenant and admin accounts.</p>
    <form onSubmit={submit} className="mt-5 space-y-5 rounded-[26px] border border-slate-200/80 bg-white p-6 shadow-[0_25px_70px_rgba(15,23,42,0.08)] sm:p-7">
      <label className="block text-sm font-semibold text-slate-800" htmlFor="recovery-email">Email
        <div className="relative mt-2"><Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input id="recovery-email" type="email" required maxLength={254} autoComplete="email" value={email} disabled={saving} onChange={event => { setEmail(event.target.value); setError(''); setMessage(''); }} placeholder="Enter your email address" className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
        </div>
      </label>
      <p className="text-xs text-slate-500">Up to 3 reset-link requests per email address every 15 minutes.</p>
      {message && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <button disabled={saving} className="h-14 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Sending reset link...' : message ? 'Send another link' : 'Send reset link'}</button>
      <button type="button" onClick={onBack} disabled={saving} className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"><ArrowLeft size={17} />Back to sign in</button>
    </form>
  </div>;
}
