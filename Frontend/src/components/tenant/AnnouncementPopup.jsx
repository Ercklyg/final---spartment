import { useEffect, useRef, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useSessionState } from '../../lib/useSessionState.js';
import { notificationsChangedEvent } from '../../lib/notifications.js';

const version = item => `${item.id}:${item.announcement_revision}`;

function AnnouncementDialog({ items, onLater, onAcknowledged, reload }) {
  const dialog = useRef(null), busy = useRef(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const index = Math.max(0, items.findIndex(item => version(item) === selected));
  const item = items[index];
  useEffect(() => {
    const element = dialog.current, opener = document.activeElement;
    const overflow = document.documentElement.style.overflow;
    element.showModal();
    document.documentElement.style.overflow = 'hidden';
    return () => {
      element.close(); document.documentElement.style.overflow = overflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  async function acknowledge() {
    if (busy.current) return;
    busy.current = true; setSaving(true); setError('');
    try {
      await api.post(`/notifications/announcements/${item.id}/acknowledge`, { revision: item.announcement_revision });
      onAcknowledged(item);
      window.dispatchEvent(new Event(notificationsChangedEvent));
    } catch (reason) {
      setError(reason.message);
      if (reason.status === 409) reload();
    } finally { busy.current = false; setSaving(false); }
  }
  return <dialog ref={dialog} aria-labelledby="tenant-announcement-title" onCancel={event => { event.preventDefault(); if (!saving) onLater(); }}
    className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-teal-200 bg-white p-5 shadow-2xl backdrop:bg-slate-950/50 sm:p-6">
    <header className="flex items-start gap-3"><span className="hidden rounded-xl bg-teal-50 p-3 text-teal-700 sm:block"><Megaphone size={22}/></span>
      <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Announcement</p><h2 id="tenant-announcement-title" className="mt-1 break-words text-xl font-bold text-slate-900">{item.title}</h2></div>
      <button type="button" aria-label="Close announcements for now" disabled={saving} onClick={onLater} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X size={20}/></button>
    </header>
    <p className="mt-3 text-xs text-slate-500">Published {new Date(item.created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</p>
    <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{item.message}</p>
    <p className="mt-5 text-xs text-slate-500">{items.length} unread announcement{items.length === 1 ? '' : 's'} remaining. You can also find these in Notifications.</p>
    {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <footer className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
      <button type="button" disabled={saving} onClick={onLater} className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 disabled:opacity-50">Later</button>
      {items.length > 1 && <button type="button" disabled={saving} onClick={() => { setSelected(version(items[(index + 1) % items.length])); setError(''); }} className="min-h-11 rounded-lg border border-teal-200 px-4 text-sm font-semibold text-teal-700 disabled:opacity-50">Next</button>}
      <button type="button" disabled={saving} onClick={acknowledge} className="min-h-11 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50">{saving ? 'Saving...' : 'Acknowledge'}</button>
    </footer>
  </dialog>;
}

export default function AnnouncementPopup({ userId }) {
  const [items, setItems] = useState([]);
  const [dismissed, setDismissed] = useSessionState(`announcement-dismissed:${userId}`, []);
  const [revision, setRevision] = useState(0);
  const reload = () => setRevision(value => value + 1);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const found = [];
      let offset = 0;
      while (!controller.signal.aborted) {
        const page = await api.get(`/notifications/announcements?limit=25&offset=${offset}`, { force: true, signal: controller.signal });
        const rows = Array.isArray(page.data) ? page.data : [];
        found.push(...rows); offset += rows.length;
        if (!rows.length || offset >= page.total) break;
      }
      if (!controller.signal.aborted) setItems([...new Map(found.map(item => [item.id, item])).values()]);
    }
    load().catch(() => { /* Keep the tenant portal usable during outages. */ });
    return () => controller.abort();
  }, [revision, userId]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible' && navigator.onLine) setRevision(value => value + 1); };
    const timer = setInterval(refresh, 15000);
    window.addEventListener('focus', refresh); window.addEventListener('online', refresh);
    window.addEventListener(notificationsChangedEvent, refresh); document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); window.removeEventListener(notificationsChangedEvent, refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  const queue = items.filter(item => !dismissed.includes(version(item)));
  if (!queue.length) return null;
  return <AnnouncementDialog items={queue} reload={reload}
    onLater={() => setDismissed(previous => [...new Set([...previous, ...queue.map(version)])])}
    onAcknowledged={item => setItems(previous => previous.filter(entry => entry.id !== item.id || entry.announcement_revision !== item.announcement_revision))}/>;
}
