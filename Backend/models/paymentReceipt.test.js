import test from 'node:test';
import assert from 'node:assert/strict';
import {receiptHtml,loadPaymentReceipt} from './paymentReceipt.js';
test('Receipt uses individual payment amount and escapes stored text',()=>{
  const html=receiptHtml({id:'payment-1',amount:1000.25,payment_date:'2026-09-13',reference_note:'<script>alert(1)</script>',bills:{id:'bill-1',bill_type:'rent',billing_period:'2026-09-01',due_date:'2026-09-15',rent_amount:6500,leases:{profiles:{full_name:'A & B'},rooms:{room_number:'201',buildings:{name:'Main <Building>'}}}}});
  assert.ok(html.includes('1,000.25'));assert.ok(!html.includes('6,500'));
  assert.ok(html.includes('A &amp; B'));assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));assert.ok(html.includes('payment-1'));assert.ok(html.includes('bill-1'));
  assert.ok(html.includes('does not indicate that the entire bill is fully paid'));
});
test('Missing or inaccessible payments cannot produce a receipt',async()=>{
  const client={from:()=>({select:()=>({eq:()=>({single:async()=>({data:null,error:{message:'not found'}})})})})};
  await assert.rejects(loadPaymentReceipt(client,'missing'),/Unable to load/);
});
