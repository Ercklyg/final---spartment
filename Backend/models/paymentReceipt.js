import { money } from './billing.js';
export async function loadPaymentReceipt(client,id) {
  const {data,error}=await client.from('payments').select('id,amount,payment_date,reference_note,bills(id,bill_type,billing_period,due_date,rent_amount,electricity_amount,water_amount,leases(profiles(full_name),rooms(room_number,buildings(name))))').eq('id',id).single();
  if(error||!data?.bills)throw new Error('Unable to load this payment receipt. Refresh your bills and try again.');
  return data;
}
export const escapeReceiptText = value => String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function receiptHtml(payment) {
  const bill=payment.bills,lease=bill.leases,room=lease?.rooms;
  const e=escapeReceiptText;
  const receiptReference=String(payment.id).replaceAll('-','').slice(0,8).toUpperCase();
  const date=value=>value ? new Date(value+'T12:00:00').toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}) : 'Not available';
  const period=new Date(bill.billing_period+'T12:00:00').toLocaleDateString('en-PH',{month:'long',year:'numeric'});
  const detail=(label,value)=>`<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`;
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Spartment payment receipt ${e(receiptReference)}</title>
<style>
*{box-sizing:border-box}body{font:14px/1.55 Arial,sans-serif;color:#172033;margin:0;padding:28px 18px;background:#f1f5f9}main{max-width:740px;margin:auto;background:white;border:1px solid #dfe6ef;border-top:5px solid #2563eb;border-radius:14px;padding:36px;box-shadow:0 8px 30px #0f172a08}
header{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding-bottom:24px;border-bottom:1px solid #e2e8f0}.brand{font-size:25px;font-weight:800;letter-spacing:-1px;color:#0f172a}.subtitle{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#64748b;margin-top:3px}.heading{text-align:right}h1{font-size:20px;margin:0 0 8px;letter-spacing:-.5px}.badge{display:inline-block;border:1px solid #a7f3d0;border-radius:20px;background:#ecfdf5;color:#047857;padding:3px 10px;font-size:11px;font-weight:bold}
.amount-panel{display:flex;justify-content:space-between;align-items:center;gap:16px;background:#eff6ff;border:1px solid #dbeafe;border-radius:10px;padding:22px;margin:24px 0}.label{margin:0;color:#475569;font-size:12px}.amount{font-size:32px;font-weight:800;letter-spacing:-1px;color:#1e40af;line-height:1.25;margin-top:5px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.payment-date{text-align:right;flex-shrink:0}.payment-date strong{display:block;margin-top:4px;font-size:14px}
h2{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#64748b;margin:24px 0 12px}dl{margin:0;display:grid;grid-template-columns:1fr 1fr;gap:18px 28px}dt{font-size:12px;color:#64748b;margin-bottom:4px}dd{margin:0;font-weight:600;overflow-wrap:anywhere;white-space:pre-wrap}.billing{border-top:1px solid #e2e8f0;margin-top:24px;padding-top:1px}.note{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;white-space:pre-wrap;overflow-wrap:anywhere;margin:0}.identifiers{border-top:1px dashed #cbd5e1;margin-top:24px;padding-top:18px;grid-template-columns:1fr;gap:10px}.identifiers dd{font:11px/1.6 monospace;color:#475569;font-weight:400}footer{border-top:1px solid #e2e8f0;margin-top:22px;padding-top:16px;color:#64748b;font-size:11px;line-height:1.7}footer p{margin:0}footer strong{display:block;color:#334155;font-size:12px;margin-bottom:6px}
@media(max-width:480px){body{padding:12px 8px}main{padding:20px 16px;border-radius:10px}header{gap:12px}.brand{font-size:22px}h1{font-size:17px}.subtitle{font-size:9px}.amount-panel{align-items:flex-start;flex-direction:column;padding:16px}.payment-date{text-align:left}.amount{font-size:29px}dl{grid-template-columns:1fr;gap:14px}}
@page{size:A4;margin:16mm}@media print{body{padding:0;background:white;font-size:12px}main{max-width:none;box-shadow:none;border:0;border-top:4px solid #2563eb;border-radius:0;padding:20px 0}header,.amount-panel,dl>div,.note{break-inside:avoid}h2{break-after:avoid}.amount-panel{print-color-adjust:exact;-webkit-print-color-adjust:exact}.identifiers{grid-template-columns:1fr}footer{font-size:10px}}
</style></head><body><main>
<header><div><div class="brand">Spartment</div><div class="subtitle">Property Management</div></div><div class="heading"><h1>Payment receipt</h1><span class="badge">Payment recorded</span></div></header>
<div class="amount-panel"><div><p class="label">Amount received</p><div class="amount">${e(money(payment.amount))}</div></div><div class="payment-date"><p class="label">Payment date</p><strong>${e(date(payment.payment_date))}</strong></div></div>
<section><h2>Received from</h2><dl>${detail('Tenant',lease?.profiles?.full_name || 'Not available')}${detail('Property / Room',(room?.buildings?.name || 'Not available')+' / '+(room?.room_number || 'Not available'))}</dl></section>
<section class="billing"><h2>Payment applies to</h2><dl>${detail('Bill type',bill.bill_type==='rent'?'Rent':bill.bill_type==='utility'?'Utilities':bill.bill_type)}${detail('Billing period',period)}${detail('Bill due date',date(bill.due_date))}</dl></section>
<section><h2>Reference note</h2><p class="note">${e(payment.reference_note || 'Not provided')}</p></section>
<dl class="identifiers">${detail('Receipt reference',receiptReference)}</dl>
<footer><strong>Thank you for your payment.</strong><p>This receipt acknowledges the individual payment shown above. It does not indicate that the entire bill is fully paid. Tenant and room details reflect the currently linked records.</p></footer>
</main></body></html>`;
}
