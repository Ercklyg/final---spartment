import { useState } from "react";
import BillPaymentDialog from "./BillPaymentDialog.jsx";
import { balance, cents, money, paid, status, total } from "./billingPayments.js";

const tenants = [["Maria Santos","101",850,220,true],["Leo Aquino","208",890,210,true],["Juan Dela Cruz","103",920,310,false],["Andrea Lim","105",0,0,false],["Carlos Reyes","107",1100,280,true],["Sophia Chen","109",760,190,false],["Miguel Tan","201",0,0,false],["Isabella Cruz","203",980,240,true],["Rafael Gomez","204",1240,350,false],["Nina Ramos","206",0,0,false]];
const colors = { Paid: "bg-emerald-50 text-emerald-700", Pending: "bg-amber-50 text-amber-700", "Partially paid": "bg-orange-50 text-orange-700", Overdue: "bg-rose-50 text-rose-700", "No charges": "bg-slate-100 text-slate-600" };
const field = "rounded-lg border border-slate-300 p-2 text-sm";
const button = "rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40";

export default function BillingLedger({ kind }) {
  const utility = kind === "Utility";
  const [bills, setBills] = useState(() => (utility ? tenants : tenants.slice(0, 5)).map(([name, room, e, w, settled]) => {
    const bill = { id: `${kind}-${room}-2026-05`, name, room, period: "2026-05", due: `2026-05-${utility ? "20" : "15"}`, rent: utility ? 0 : 650000, e: utility ? e * 100 : 0, w: utility ? w * 100 : 0, payments: [] };
    if (settled && total(bill)) bill.payments.push({ id: `${bill.id}-001`, amount: total(bill), date: bill.due, note: "" });
    return bill;
  }));
  const [month, setMonth] = useState("2026-05");
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState({});
  const [active, setActive] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const period = bills.filter(b => b.period === month);
  const shown = period.filter(b => `${b.name} ${b.room}`.toLowerCase().includes(query.toLowerCase()));
  const sum = fn => period.reduce((result, b) => result + fn(b), 0);
  const selected = bills.find(b => b.id === active);
  const save = targets => {
    const updates = [];
    for (const bill of targets) {
      if (!drafts[bill.id]) continue;
      const e = cents(drafts[bill.id].e), w = cents(drafts[bill.id].w);
      if (e === null || w === null) { setError(`Room ${bill.room}: enter non-negative amounts with up to two decimal places.`); return; }
      if (e + w < paid(bill)) { setError(`Room ${bill.room}: charges cannot be lower than recorded payments.`); return; }
      updates.push({ ...bill, e, w });
    }
    setBills(old => old.map(b => updates.find(update => update.id === b.id) || b));
    setDrafts(old => { const next = { ...old }; updates.forEach(b => delete next[b.id]); return next; });
    setError(""); setNotice(`${updates.length} bill(s) saved in this view.`);
  };
  const cards = utility ? [["Electricity", sum(b => b.e)], ["Water", sum(b => b.w)], ["Collected", sum(paid)], ["Balance", sum(balance)]] : [["Total billed", sum(total)], ["Collected", sum(paid)], ["Balance", sum(balance)], ["Overdue balance", sum(b => status(b) === "Overdue" ? balance(b) : 0)]];
  return <>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value]) => <article key={label} className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-600">{label}</p><h2 className="mt-2 text-2xl font-bold">{money(value)}</h2></article>)}</div>
    <section className="mt-5 rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-end gap-3 p-5"><div className="mr-auto"><h2 className="text-xl font-bold">{utility ? "Utility bills" : "Rent payment history"}</h2><p className="text-sm text-slate-600">Status updates from payments and due dates.</p></div>
        <label>Month <input type="month" value={month} onChange={e => setMonth(e.target.value)} className={field}/></label>
        <input aria-label="Search tenant or room" placeholder="Search tenant or room" value={query} onChange={e => setQuery(e.target.value)} className={field}/>
        {utility && <button type="button" onClick={() => save(bills)} disabled={!Object.keys(drafts).length} className={button}>Save all ({Object.keys(drafts).length})</button>}
      </div>
      {notice && <p role="status" className="px-5 pb-3 text-emerald-700">{notice}</p>}{error && <p role="alert" className="px-5 pb-3 text-rose-700">{error}</p>}
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead><tr>{["Tenant / Room", "Period / Due date", ...(utility ? ["Electricity", "Water"] : []), "Total", "Paid", "Balance", "Status", "Actions"].map(title => <th key={title}>{title}</th>)}</tr></thead>
        <tbody>{shown.map(bill => <tr key={bill.id} className="border-t border-slate-200">
          <td><strong>{bill.name}</strong><p>Room {bill.room}</p>{drafts[bill.id] && <p className="text-amber-700">Unsaved changes</p>}</td>
          <td><p>{bill.period}</p><p className="whitespace-nowrap text-sm text-slate-600">Due {bill.due}</p></td>
          {utility && ["e", "w"].map(key => <td key={key}><input aria-label={`${bill.name} ${key === "e" ? "electricity" : "water"}`} type="number" min="0" step="0.01" value={drafts[bill.id]?.[key] ?? bill[key]/100} onChange={event => { const value = event.target.value; setDrafts(old => ({ ...old, [bill.id]: { e: String(bill.e/100), w: String(bill.w/100), ...old[bill.id], [key]: value } })); setError(""); setNotice(""); }} className={`w-28 ${field}`}/></td>)}
          <td>{money(total(bill))}</td><td>{money(paid(bill))}</td><td className={`font-semibold ${balance(bill) ? "text-rose-700" : "text-emerald-700"}`}>{money(balance(bill))}</td>
          <td><span className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium ${colors[status(bill)]}`}><span aria-hidden="true" className="h-2 w-2 rounded-full bg-current"/>{status(bill)}</span>{status(bill) === "Overdue" && paid(bill) > 0 && <p className="mt-1 text-sm text-slate-600">Partial payment received</p>}</td>
          <td><div className="flex flex-wrap gap-2">
            {balance(bill) > 0 && <button type="button" disabled={Boolean(drafts[bill.id])} onClick={async () => {
              try {
                await navigator.clipboard.writeText(`Hello ${bill.name}, your ${kind.toLowerCase()} bill for ${bill.period}, Room ${bill.room}, has a remaining balance of ${money(balance(bill))}. Due date: ${bill.due}. Please contact your landlord regarding payment. Thank you.`);
                setNotice("Reminder copied. Paste it into your messaging app to send it.");
              } catch { setError("Unable to copy the reminder. Please allow clipboard access and try again."); }
            }} className={button}>Copy reminder</button>}
            {utility && drafts[bill.id] && <button type="button" onClick={() => save([bill])} className={button}>Save charges</button>}
            {total(bill) > 0 && <button type="button" disabled={Boolean(drafts[bill.id])} onClick={() => setActive(bill.id)} className={button}>{balance(bill) ? "Record payment" : "View receipt"}</button>}
          </div></td>
        </tr>)}{!shown.length && <tr><td colSpan={utility ? 10 : 8} className="p-8 text-center">No bills match this month or search.</td></tr>}</tbody>
      </table></div>
    </section>
    {selected && <BillPaymentDialog key={selected.id} bill={selected} kind={kind} onClose={() => setActive(null)} onRecord={payment => {
      setBills(old => old.map(b => b.id === selected.id ? { ...b, payments: [...b.payments, payment] } : b)); setNotice("Payment recorded in this view. Balance and status updated.");
    }} onVoid={(id, reason) => {
      setBills(old => old.map(b => b.id === selected.id ? { ...b, payments: b.payments.map(p => p.id === id ? { ...p, voided: true, reason, voidedAt: new Date().toISOString() } : p) } : b)); setNotice("Payment voided. Original retained in history; balance and status updated.");
    }}/>} 
  </>;
}
