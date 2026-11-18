import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { closeFromBackdrop } from '../../lib/dialog.js';

export default function AnnouncementDialog({ title, busy, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const element = ref.current;
    const opener = document.activeElement;
    const overflow = document.documentElement.style.overflow;
    element.showModal();
    document.documentElement.style.overflow = 'hidden';
    return () => {
      element.close();
      document.documentElement.style.overflow = overflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={ref} aria-label={title} aria-busy={busy}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    onMouseDown={event => closeFromBackdrop(event, onClose, busy)}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const items = [...ref.current.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled)')];
      if (!items.length) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    }}
    className="m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl backdrop:bg-slate-950/40 sm:p-6">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <button type="button" disabled={busy} onClick={onClose} aria-label="Close announcement window" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X size={20}/></button>
    </div>
    {children}
  </dialog>;
}
