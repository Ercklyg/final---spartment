import './DashboardDialog.css';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { closeFromBackdrop } from '../../lib/dialog.js';

export default function DashboardDialog({ title, children, onClose, wide = false, layout = "default" }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const element = dialog.current;
    element.showModal();
    return () => { element.close(); previous?.focus({ preventScroll: true }); };
  }, []);
  return createPortal(<dialog ref={dialog} aria-label={title} onCancel={event => { if (event.target !== event.currentTarget) return; event.preventDefault(); event.stopPropagation(); onClose(); }} onMouseDown={event => { if (event.target.closest("dialog") === event.currentTarget) closeFromBackdrop(event, onClose); }} className={`dashboard-dialog dashboard-dialog--${layout} m-auto max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl backdrop:bg-slate-950/40 ${wide ? 'max-w-3xl' : 'max-w-2xl'}`}>
    <div className="dashboard-dialog-header mb-4 flex items-center justify-between gap-4"><h2 className="text-xl font-bold">{title}</h2><button autoFocus type="button" onClick={onClose} aria-label={title === "All notifications" ? "Close notifications" : `Close ${title.toLowerCase()}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500"><X size={20} aria-hidden="true"/></button></div>
    <div className="dashboard-dialog-body">{children}</div>
  </dialog>, document.body);
}
