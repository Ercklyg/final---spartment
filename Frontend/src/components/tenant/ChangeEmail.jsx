import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { api, auth } from '../../lib/api.js';
import { showFeedback } from '../../lib/actionFeedback.js';

const base = '/account/email-change';
export default function ChangeEmail({ onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    element.showModal();
    return () => { element.close(); previous?.focus(); };
  }, []);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [pending, setPending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const busy = useRef(false);
  const load = useCallback(async () => {
    const status = await api.get(base + '/status', { force: true, cacheMs: 0 });
    setPending(status); return status;
  }, []);
  useEffect(() => {
    let cancelled = false;
    api.get(base + '/status', { force: true }).then(status => { if (!cancelled) setPending(status); })
      .catch(failure => { if (!cancelled) setError(failure.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const stage = pending?.stage;
  const expired = stage === 'expired' || (['otp', 'ready'].includes(stage) && Date.parse(pending?.expiresAt) <= now);
  const waiting = ['otp', 'ready'].includes(stage) && !expired;
  const seconds = Math.max(0, Math.ceil((Date.parse(pending?.resendAt) - now) / 1000)) || 0;
  async function perform(action) {
    if (busy.current) return;
    busy.current = true; setSaving(true); setError(''); setMessage('');
    try {
      const result = await api.post(base + '/' + action, { email, otp }, { silent: true, timeoutMs: 30000 });
      if (action === 'verify') {
        auth.clearLocalSession();
        showFeedback('Email updated. Sign in using your new email.');
        return;
      }
      setPending(result); setOtp('');
      setMessage('A verification code was sent to your new email. Check your inbox and spam folder.');
    } catch (failure) { setError(failure.message); await load().catch(() => {}); }
    finally { busy.current = false; setSaving(false); }
  }
  return <dialog ref={dialog} aria-labelledby="change-email-title" onCancel={event => { event.preventDefault(); if (!busy.current) onClose(); }} className="tenant-email-dialog m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm sm:p-7">
    <div className="flex items-center justify-between gap-3"><h2 id="change-email-title" className="text-xl font-bold tracking-tight">Change email</h2><button type="button" aria-label="Close email change" disabled={saving} onClick={onClose} className="-mr-2 shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50"><X size={20}/></button></div>
    {loading ? <p role="status" className="mt-3 text-sm">Checking pending changes...</p> : <>
      {waiting ? <div>
        <p className="mt-2 text-sm leading-6 text-slate-500">Enter the 6-digit code sent to</p>
        <div className="mt-0.5 flex items-start justify-between gap-3"><p className="min-w-0 break-all text-sm font-semibold text-slate-800">{pending.newEmail}</p><button type="button" disabled={saving} onClick={() => { setEmail(pending.newEmail); setPending({ stage: 'none', resendAt: pending.resendAt }); setOtp(''); setMessage(''); }} className="shrink-0 text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50">Edit</button></div>
        <form className="mt-6" onSubmit={event => { event.preventDefault(); void perform('verify'); }}>
          <label htmlFor="email-change-otp" className="sr-only">Verification code</label>
          <input id="email-change-otp" autoFocus aria-describedby="email-code-help" aria-invalid={Boolean(error)} required pattern="[0-9]{6}" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={otp} onChange={event => { setOtp(event.target.value.replace(/\D/g, '')); setError(''); }} className="tenant-email-code h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-center font-mono text-2xl tracking-[0.35em] text-slate-900 outline-none placeholder:text-slate-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"/>
          <div id="email-code-help" className="mt-3 flex items-center justify-between gap-2 text-xs"><span className="text-slate-500">Valid for 10 minutes</span><button type="button" disabled={saving || seconds > 0} onClick={() => void perform('resend')} className="font-medium text-blue-600 hover:text-blue-800 disabled:text-slate-400">{seconds > 0 ? `Resend in ${seconds}s` : 'Resend code'}</button></div>
          <button disabled={saving || otp.length !== 6} className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-200 disabled:text-blue-500">{saving ? 'Verifying...' : 'Verify email'}</button>
        </form>
        <p className="mt-4 text-center text-xs leading-5 text-slate-500">You’ll be signed out after this change.</p>
      </div> : <form className="mt-2" onSubmit={event => { event.preventDefault(); void perform('start'); }}>
        <p className="text-sm leading-6 text-slate-500">We’ll send a code to your new email.</p>
        {expired && <p role="status" className="mb-3 text-sm text-amber-700">Your verification code expired. Enter your new email to request another code.</p>}
        <label htmlFor="new-tenant-email" className="mt-5 block text-sm font-medium text-slate-700">New email</label>
        <input id="new-tenant-email" autoFocus type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} required value={email} onChange={event => { setEmail(event.target.value); setError(''); }} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"/>
        <button disabled={saving || seconds > 0} className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-200 disabled:text-blue-500">{saving ? 'Sending...' : seconds > 0 ? `Try again in ${seconds}s` : 'Send code'}</button>
      </form>}
    </>}
    {message && <p role="status" className="sr-only">{message}</p>}
    {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
  </dialog>;
}
