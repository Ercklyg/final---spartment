import { useRef, useState } from 'react';
import { emailApprovalToken } from '../lib/emailChange.js';
import { browserRequest } from '../lib/http.js';

export default function ApproveEmailChangePage() {
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  async function approve() {
    if (busy.current) return;
    busy.current = true; setSaving(true); setError('');
    try {
      await browserRequest('/account/email-change/approve', { method: 'POST', body: JSON.stringify({ token: emailApprovalToken }), signal: AbortSignal.timeout(30000) });
      setDone(true);
    } catch (failure) { setError(failure.message); }
    finally { busy.current = false; setSaving(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5"><section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-lg">
    <h1 className="text-2xl font-bold">{done ? 'Email change approved' : 'Approve email change'}</h1>
    <p className="mt-3 text-sm text-slate-600">{done ? 'A verification code has been sent to your new email. Return to tenant settings on the device where you started the change and enter the code.' : 'Approve only if you requested an email change in your Spartment tenant settings. Your current email will remain active until the new email is verified.'}</p>
    {!done && (emailApprovalToken ? <button disabled={saving} onClick={approve} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{saving ? 'Approving...' : 'Approve email change'}</button> : <p role="alert" className="mt-4 text-rose-700">This approval link is missing or has already been cleared. Open the latest link from your email again.</p>)}
    {error && <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p>}
  </section></main>;
}
