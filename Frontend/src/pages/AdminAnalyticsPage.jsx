import PageSkeleton from "../components/PageSkeleton.jsx";
import { showFeedback } from "../lib/actionFeedback.js";
import { api } from '../lib/api.js';
import { useCallback, useState } from "react";
import { ArrowUpRight, Download } from "lucide-react";
import AdminHeader from "../components/admin/AdminHeader.jsx";
import AdminSidebar from "../components/admin/AdminSidebar.jsx";
import { loadAdminAnalytics } from "../lib/adminAnalytics.js";
import { money, today } from "../lib/billing.js";
import { useRemoteData } from "../lib/useRemoteData.js";
import "./AdminAnalyticsPage.css";

const roomColors = { occupied: "#2563eb", available: "#10b981", reserved: "#f59e0b", maintenance: "#94a3b8" };
const paymentColors = { Paid: "#10b981", Pending: "#f59e0b", "Partially paid": "#f97316", Late: "#f43f5e" };
const periodLabel = value => /^\d{4}-\d{2}$/.test(value)
  ? new Date(value + "-01T12:00:00").toLocaleDateString("en-PH", { month: "short", year: "2-digit" }) : value;

function PaymentStatus({ status }) {
  const tone = status === "Late" ? "overdue" : status === "Paid" ? "paid" : "partially-paid";
  return <span className={"analytics-payment-status " + tone}>{status}</span>;
}

function AnalyticsReport({ data, month, period, onNavigate }) {
  const { snapshot, series, forecast, forecastMonths, comparison } = data;
  const ceiling = Math.max(1, ...series.map(point => point.value));
  const comparisonCeiling = Math.max(1, ...series.flatMap(point => [point.billed, point.value]));
  const [year, selectedMonth] = month.split("-").map(Number);
  const forecastLabel = new Date(year, selectedMonth, 1).toLocaleDateString("en-PH", { month: "long", year: "numeric" });
  const distribution = Object.entries(paymentColors).map(([status, color]) => ({
    status, color, count: snapshot.selected.filter(bill => bill.status === status).length,
  }));
  const roomCount = data.roomCount;
  // Angles and widths are presentation values; balances and totals come from the backend.
  const donut = snapshot.inventory.map((item, index, inventory) => {
    const start = inventory.slice(0, index).reduce((sum, row) => sum + row.count, 0);
    return roomColors[item.status] + " " + (start / roomCount * 100) + "% " + ((start + item.count) / roomCount * 100) + "%";
  }).join(", ");
  const outstanding = snapshot.rows.filter(bill => bill.balance > 0);

  return <>
    <section className="analytics-panel analytics-revenue">
      <div className="analytics-panel-heading"><div><h2>Revenue trend</h2><p>{period} collections · through {snapshot.cutoff}</p></div><span className="analytics-legend"><i />Collected revenue</span></div>
      <div className="analytics-chart-scroll"><div className="analytics-chart">
        <div className="analytics-axis">{[1, .75, .5, .25, 0].map(tick => <span key={tick}>{money(ceiling * tick)}</span>)}</div>
        <div className="analytics-plot">
          <div className="analytics-gridlines">{[0, 1, 2, 3, 4].map(line => <span key={line} />)}</div>
          {series.map(point => <div className="analytics-column" key={point.label}>
            <div className="analytics-bar-space"><div className="analytics-bar" style={{ height: point.value / ceiling * 100 + "%" }} title={point.label + ": " + money(point.value)} /></div>
            <span className="analytics-bar-value">{money(point.value)}</span><span className="analytics-bar-label">{periodLabel(point.label)}</span>
          </div>)}
        </div>
      </div></div>
      <p className="analytics-footnote">Rent and utility collections use payment dates. Zero means no saved payments for that period; missing records can affect the totals.</p>
    </section>

    <section className="analytics-panel analytics-income-comparison" aria-labelledby="forecast-heading">
      <div className="analytics-panel-heading"><div><h2 id="forecast-heading">Three-month moving-average forecast</h2><p>Estimated collections for {forecastLabel}</p></div></div>
      <div className="analytics-income-summary">{forecastMonths.map(point => <div key={point.label}><span>{periodLabel(point.label)} collections</span><strong>{money(point.value)}</strong></div>)}</div>
      <p className="analytics-muted">Forecast for {forecastLabel}</p>
      <p className="text-3xl font-bold text-blue-700" aria-live="polite">{forecast === null ? "Insufficient completed history" : money(forecast)}</p>
      <p className="analytics-footnote">{forecast === null
        ? "Select a completed month with at least one saved payment in each of the three months shown to calculate an estimate."
        : "Average recorded collections for the three completed months shown above."} Uses monthly history regardless of the chart grouping. This is an estimate, not guaranteed income.</p>
    </section>

    <section className="analytics-panel analytics-income-comparison">
      <div className="analytics-panel-heading"><div><h2>Billed amounts and collections</h2><p>{period} bills and recorded payments through {snapshot.cutoff}</p></div><span className="analytics-legend">PHP</span></div>
      <div className="analytics-income-summary"><div><span>Total billed in shown periods</span><strong>{money(comparison.billed)}</strong></div><div><span>Total collected in shown periods</span><strong>{money(comparison.collected)}</strong></div><div><span>Periods shown</span><strong>{comparison.periods}</strong></div></div>
      <div className="analytics-comparison-list">{series.map(point => <div key={point.label}>
        <span>{periodLabel(point.label)}</span>
        <div role="img" aria-label={point.label + ": billed " + money(point.billed) + ", collected " + money(point.value)}>
          <i className="analytics-projected" style={{ width: point.billed / comparisonCeiling * 100 + "%" }} />
          <i className="analytics-actual" style={{ width: point.value / comparisonCeiling * 100 + "%" }} />
        </div><strong>{money(point.billed)} / {money(point.value)}</strong>
      </div>)}</div>
      <p className="analytics-footnote"><span className="analytics-key analytics-projected" /> Billed &nbsp; <span className="analytics-key analytics-actual" /> Collected</p>
      <p className="analytics-footnote">Bills use billing periods; collections use payment dates and may settle older bills. These figures do not represent an income target or collection rate.</p>
    </section>

    <section className="analytics-panel analytics-tenant-analysis" aria-labelledby="payment-followup-heading">
      <div className="analytics-panel-heading"><div><h2 id="payment-followup-heading">Outstanding balances and payment follow-up</h2><p>Saved bills and payments through {snapshot.cutoff}</p></div><button type="button" onClick={() => onNavigate?.("Billing")}>View billing</button></div>
      <div className="analytics-income-summary">
        <div><span>Outstanding balance</span><strong>{money(snapshot.outstanding)}</strong><p className="analytics-muted">Unpaid rent and utility balances.</p></div>
        <div><span>Overdue balance</span><strong>{money(snapshot.overdue)}</strong><p className="analytics-muted">Included in the outstanding balance.</p></div>
        <div><span>Potential monthly vacancy gap</span><strong>{money(snapshot.vacancyGap)}</strong><p className="analytics-muted">Monthly rates for {snapshot.available} currently available rooms.</p></div>
      </div>
      <div className="analytics-table-scroll"><table><caption className="sr-only">Outstanding bills and payment follow-up</caption><thead><tr><th>Tenant / Room</th><th>Bill</th><th>Balance</th><th>Status</th><th>Follow-up</th></tr></thead>
        <tbody>{outstanding.map(bill => <tr key={bill.id}><td>{bill.name}<p className="analytics-muted">{bill.room}</p></td><td>{bill.bill_type} / {bill.billing_period.slice(0, 7)}</td><td className="analytics-balance">{money(bill.balance)}</td><td><PaymentStatus status={bill.status} /></td><td>{bill.status === "Late" ? "Follow up on overdue balance" : "Monitor the due date"}</td></tr>)}
          {!outstanding.length && <tr><td colSpan={5}>No outstanding balances in this snapshot.</td></tr>}
        </tbody>
      </table></div>
      <p className="analytics-footnote">Overdue balances may still be collected. The vacancy figure is potential monthly rent from currently available rooms; reserved and maintenance rooms are excluded.</p>
    </section>

    <div className="analytics-breakdowns">
      <section className="analytics-panel">
        <div className="analytics-panel-heading"><div><h2>Room availability</h2><p>Current inventory · all buildings</p></div></div>
        <div className="analytics-occupancy-visual">
          <div className="analytics-donut" style={{ background: roomCount ? "conic-gradient(" + donut + ")" : "#e2e8f0" }} role="img" aria-label={roomCount ? snapshot.inventory.map(item => item.count + " " + item.status + " rooms").join(", ") : "No rooms recorded"}>
            <div><strong>{snapshot.occupancy.toFixed(1)}%</strong><span>occupied</span></div>
          </div>
          <div><p className="analytics-eyebrow">ROOM MIX</p><p className="analytics-occupancy-caption">Space for your<br />next residents.</p><p className="analytics-muted">{snapshot.available} available · {snapshot.inventory.find(item => item.status === "reserved")?.count || 0} reserved</p></div>
        </div>
        <div className="analytics-rows">{snapshot.inventory.map(item => <div key={item.status}><span className="capitalize"><i style={{ background: roomColors[item.status] }} />{item.status}</span><strong>{item.count} <small>rooms</small></strong><span className="analytics-percent">{roomCount ? (item.count / roomCount * 100).toFixed(1) : "0"}%</span></div>)}</div>
        <p className="analytics-footnote">Current room availability is independent of the selected report month.</p>
      </section>
      <section className="analytics-panel">
        <div className="analytics-panel-heading"><div><h2>Payment distribution</h2><p>{periodLabel(month)} · {snapshot.selected.length} rent and utility bills</p></div></div>
        <div className="analytics-payment-bars">{distribution.map(item => <div key={item.status}><span>{item.status}</span><div><i style={{ width: (snapshot.selected.length ? item.count / snapshot.selected.length * 100 : 0) + "%", background: item.color }} /></div><strong>{item.count}</strong></div>)}</div>
        <p className="analytics-footnote">{snapshot.selected.length ? "Status as of " + snapshot.cutoff + ". Review individual balances in Billing." : "No bills were issued for this month."} Rent and utilities are counted separately.</p>
      </section>
    </div>

    <section className="analytics-panel analytics-tenant-analysis">
      <div className="analytics-panel-heading"><div><h2>Tenant payment analysis</h2><p>Bills for {periodLabel(month)} · payments through {snapshot.cutoff}</p></div><button type="button" onClick={() => onNavigate?.("Billing")}>View billing</button></div>
      <div className="analytics-table-scroll"><table><thead><tr><th>Tenant / Room</th><th>Type</th><th>Billed</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
        <tbody>{snapshot.selected.map(bill => <tr key={bill.id}><td>{bill.name}<p className="analytics-muted">{bill.room}</p></td><td>{bill.bill_type}</td><td>{money(bill.total)}</td><td>{money(bill.paid)}</td><td className={bill.balance ? "analytics-balance" : ""}>{money(bill.balance)}</td><td><PaymentStatus status={bill.status} /></td></tr>)}
          {!snapshot.selected.length && <tr><td colSpan={6}>No saved bills for this month.</td></tr>}
        </tbody>
      </table></div>
    </section>

    <section className="analytics-panel analytics-followup">
      <div><p className="analytics-eyebrow">FOLLOW-UP</p><h2>From insight to action</h2><p className="analytics-muted">Review bills and available rooms.</p></div>
      <button type="button" onClick={() => onNavigate?.("Billing")}><span><strong>Review unpaid bills</strong><small>{outstanding.length} outstanding · {snapshot.late.length} overdue</small></span><ArrowUpRight size={20} /></button>
      <button type="button" onClick={() => onNavigate?.("Rooms")}><span><strong>Review available rooms</strong><small>{snapshot.available} rooms ready for assignment</small></span><ArrowUpRight size={20} /></button>
    </section>
    <p className="analytics-footnote">Loaded {new Date(data.loadedAt).toLocaleString("en-PH")}. Refresh to include new changes.</p>
  </>;
}

export default function AdminAnalyticsPage({ onNavigate, onLogout }) {
  const [month, setMonth] = useState(today().slice(0, 7));
  const [period, setPeriod] = useState("Monthly");
  const [exporting,setExporting]=useState(false);
  const loader = useCallback(client => loadAdminAnalytics(client, month, period), [month, period]);
  const { data, error, loading, reload } = useRemoteData(loader);
  const exportReport = async () => {
    if (!data||exporting) return;
    setExporting(true);
    try {
    const report=await api.get('/analytics?'+new URLSearchParams({month,period,export:'csv'}));
    const url = URL.createObjectURL(new Blob([report.csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "collections-" + period.toLowerCase() + "-" + month + ".csv";
    link.click();
    showFeedback("Report export requested. Check your browser downloads.", "info");
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    }catch(error){showFeedback(error.message,'error');}finally{setExporting(false);}
  };

  return <main className="flex min-h-screen bg-[#f6f9fd]">
    <AdminSidebar activePage="Analytics & Reports" onNavigate={onNavigate} />
    <div className="min-w-0 flex-1"><AdminHeader onLogout={onLogout} />
      <div className="analytics-page">
        <header className="analytics-heading"><div><p className="analytics-eyebrow">PROPERTY PERFORMANCE</p><h1>Analytics &amp; Reports</h1><p className="analytics-muted">A closer look at collections, room availability, and payment follow-up.</p></div></header>
        <div className="analytics-toolbar">
          <div className="analytics-segments" aria-label="Revenue grouping">{["Monthly", "Quarterly", "Yearly"].map(item => <button key={item} type="button" aria-pressed={period === item} onClick={() => setPeriod(item)}>{item}</button>)}</div>
          <div className="analytics-controls">
            <label>Through <input type="month" aria-label="Report ending month" value={month} max={today().slice(0, 7)} onChange={event => { if (event.target.value) setMonth(event.target.value); }} /></label>
            <button type="button" className="analytics-refresh" disabled={loading} onClick={reload}>Refresh</button>
            <button type="button" disabled={!data||exporting} className="analytics-export disabled:opacity-50" onClick={exportReport}><Download size={16} />{exporting?'Exporting...':'Export CSV'}</button>
          </div>
        </div>
        {loading ? <PageSkeleton variant="analytics" label="Loading analytics..."/> : error ? <p role="alert" className="text-rose-700">{error} <button onClick={reload} className="underline">Retry</button></p> : <AnalyticsReport data={data} month={month} period={period} onNavigate={onNavigate} />}
      </div>
    </div>
  </main>;
}
