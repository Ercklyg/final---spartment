import { useCallback, useEffect, useRef, useState } from 'react';
import { Mail, X } from 'lucide-react';
import { api, auth } from '../../lib/api.js';
import { showFeedback } from '../../lib/actionFeedback.js';

const base = '/account/email-change';
export default function ChangeEmail({ currentEmail, onClose }) {
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
  return <dialog ref={dialog} aria-labelledby="change-email-title" onCancel={event => { event.preventDefault(); if (!busy.current) onClose(); }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm sm:p-6">
    <div className="flex items-start gap-3"><span className="rounded-xl bg-blue-50 p-3 text-blue-600"><Mail size={24}/></span><div className="min-w-0 flex-1"><h2 id="change-email-title" className="text-lg font-bold">Change email</h2><p className="text-sm text-slate-500">Enter your new email and verify it with a six-digit code.</p></div><button type="button" aria-label="Close email change" disabled={saving} onClick={onClose} className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X size={20}/></button></div>
    <p className="mt-4 break-all text-sm text-slate-600">Current email: {currentEmail}</p>
    {loading ? <p role="status" className="mt-3 text-sm">Checking pending changes...</p> : <>
      {waiting ? <div className="mt-4 space-y-3">
        <p className="break-all text-sm">New email: <strong>{pending.newEmail}</strong></p>
        <form onSubmit={event => { event.preventDefault(); void perform('verify'); }}>
          <label htmlFor="email-change-otp" className="block text-sm font-medium">Verification code sent to your new email</label>
          <input id="email-change-otp" required pattern="[0-9]{6}" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, ''))} className="mt-2 w-full rounded-xl border border-slate-200 p-3"/>
          <p className="mt-2 text-xs text-slate-500">Completing the change signs you out on all devices. Sign in again with your new email.</p>
          <button disabled={saving || otp.length !== 6} className="mt-3 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Verifying...' : 'Verify and change email'}</button>
        </form>
        <button type="button" disabled={saving || seconds > 0} onClick={() => void perform('resend')} className="block text-sm font-semibold text-blue-700 disabled:text-slate-400">{seconds > 0 ? `Resend available in ${seconds}s` : 'Resend code'}</button>
        <button type="button" disabled={saving} onClick={() => { setPending({ stage: 'none', resendAt: pending.resendAt }); setOtp(''); setMessage(''); }} className="block text-sm text-slate-600 underline">Use a different email</button>
      </div> : <form className="mt-4" onSubmit={event => { event.preventDefault(); void perform('start'); }}>
        {expired && <p role="status" className="mb-3 text-sm text-amber-700">Your verification code expired. Enter your new email to request another code.</p>}
        <label htmlFor="new-tenant-email" className="block text-sm font-medium">New email</label>
        <input id="new-tenant-email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3"/>
        <button disabled={saving || seconds > 0} className="mt-3 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Sending...' : seconds > 0 ? `Try again in ${seconds}s` : 'Send verification code'}</button>
      </form>}
      <p className="mt-4 text-xs text-slate-500">Your code expires after 10 minutes. You have five code attempts.</p>
    </>}
    {message && <p role="status" className="mt-3 text-sm text-emerald-700">{message}</p>}
    {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
  </dialog>;
}
