import { useEffect, useRef } from 'react';
import { ClipboardList, X } from 'lucide-react';
import { closeFromBackdrop } from '../../lib/dialog.js';

const rules = [
  ['Rent Payment', 'Tenants must pay their monthly rent on or before the agreed due date.'],
  ['Cleanliness', 'Tenants must keep their rooms and surrounding areas clean and sanitary.'],
  ['Noise Control', 'Loud music, shouting, and other disturbing activities are prohibited, especially from 10:00 PM to 6:00 AM.'],
  ['Visitors and Guests', 'Visitors are allowed during designated visiting hours. Overnight guests must have prior approval from the landlord.'],
  ['Property Maintenance', 'Tenants must take proper care of apartment facilities and report any damages or maintenance issues immediately.'],
  ['Pets Policy', "Pets are only allowed with the landlord's permission and must not disturb other tenants."],
  ['Property Modifications', "Tenants are not allowed to repaint, renovate, or modify their rooms without the landlord's permission."],
  ['Move-Out Notice', 'Tenants must notify the landlord before moving out, following the notice period specified in their rental agreement.'],
  ['Fire Safety', 'Tenants must avoid overloading electrical outlets and using hazardous or unauthorized electrical appliances.'],
];

export default function TenantRulesDialog({ open, onClose }) {
  const dialog = useRef(null);
  const content = useRef(null);
  const closeButton = useRef(null);

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const opener = document.activeElement;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    element.showModal();
    content.current.scrollTop = 0;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open]);

  return <dialog ref={dialog} className="tenant-rules-dialog" aria-labelledby="tenant-rules-title"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => closeFromBackdrop(event, onClose)}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      if (event.shiftKey && document.activeElement === closeButton.current) {
        event.preventDefault();
        content.current.focus();
      } else if (!event.shiftKey && document.activeElement === content.current) {
        event.preventDefault();
        closeButton.current.focus();
      }
    }}>
    <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-3 sm:px-6">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><ClipboardList size={23} aria-hidden="true"/></span>
      <h2 id="tenant-rules-title" className="min-w-0 flex-1 text-lg font-bold tracking-tight text-slate-900">Rules &amp; Regulations</h2>
      <button ref={closeButton} type="button" aria-label="Close rules" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"><X size={21} aria-hidden="true"/></button>
    </header>
    <div ref={content} tabIndex={0} role="region" aria-label="Tenant rules list" className="min-h-0 overflow-y-auto overscroll-contain px-5 py-2 sm:px-6">
      <ol className="list-decimal pl-6 marker:font-semibold marker:text-blue-600 lg:grid lg:grid-cols-2 lg:gap-x-10">
        {rules.map(([title, description]) => <li key={title} className="border-b border-slate-100 py-3 pl-1 last:border-0">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </li>)}
      </ol>
    </div>
  </dialog>;
}
