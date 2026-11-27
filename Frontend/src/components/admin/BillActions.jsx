import { BellRing, PhilippinePeso, FileText } from 'lucide-react';

const reminderDate = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
const iconButton = 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40';

export default function BillActions({ bill, disabled, onDetails, onPayment, onReminder }) {
  const name = bill.leases?.profiles?.full_name || 'Unknown tenant';
  const room = bill.leases?.rooms?.room_number || 'Unassigned';
  const paid = bill.balance <= 0;
  const target = `${name}, room ${room}`;
  const reminded = bill.last_reminded_at ? `Last reminded ${reminderDate.format(new Date(bill.last_reminded_at))}` : '';
  return <div role="group" aria-label={`Bill actions for ${target}`} className="ml-auto grid w-[148px] grid-cols-3 items-center gap-2">
    <button type="button" disabled={disabled} onClick={() => onDetails(bill)} aria-label={`View details / receipts for ${target}`} title="View details and receipts" className={`${paid ? iconButton.replace(" w-11 ", " w-full ") + " col-span-3 gap-2 px-3.5" : iconButton} border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700`}><FileText size={17} aria-hidden="true"/>{paid && <span className="text-sm font-medium">Receipt</span>}</button>
    {bill.balance > 0 && <>
      <button type="button" disabled={disabled} onClick={() => onPayment(bill)} aria-label={`Record payment for ${target}`} title="Record payment" className={`${iconButton} border-blue-100 bg-blue-50 text-blue-700 hover:border-blue-200 hover:bg-blue-100`}><PhilippinePeso size={18} aria-hidden="true"/></button>
      <button type="button" disabled={disabled} onClick={() => onReminder(bill)} aria-label={`Send reminder for ${target}`} title={reminded ? `Send reminder · ${reminded}` : 'Send reminder'} className={`${iconButton} border-amber-100 bg-amber-50 text-amber-700 hover:border-amber-200 hover:bg-amber-100`}><BellRing size={18} aria-hidden="true"/></button>
    </>}
  </div>;
}
