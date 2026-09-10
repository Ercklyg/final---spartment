

import { useState } from "react";
import { ArrowUpRight, Download } from "lucide-react";
import AdminHeader from "../components/admin/AdminHeader.jsx";
import AdminSidebar from "../components/admin/AdminSidebar.jsx";
import "./AdminAnalyticsPage.css";

const revenue=[40000,48000,54000,57000,62000,66000];
const inventory=[["Occupied",5,"#2563eb"],["Available",3,"#10b981"],["Reserved",1,"#f59e0b"],["Maintenance",1,"#94a3b8"]];
const payments=[["Paid",6,"#10b981"],["Pending",2,"#f59e0b"],["Late",2,"#f43f5e"]];
const history=revenue.map((value,index)=>({date:new Date(2025,11+index,1),value}));
const money = (value) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value);

// Periods outside the supplied history remain empty.
function seriesFor(period, month) {
  const end = new Date(month + "-01T12:00:00");
  const step = period === "Monthly" ? 1 : period === "Quarterly" ? 3 : 12;
  const start = period === "Monthly" ? end.getMonth() : period === "Quarterly" ? Math.floor(end.getMonth() / 3) * 3 : 0;
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(end.getFullYear(), start - (5 - index) * step, 1);
    const next = new Date(date.getFullYear(), date.getMonth() + step, 1);
    const records = history.filter((row) => row.date >= date && row.date < next && row.date <= end);
    const label = period === "Monthly" ? date.toLocaleDateString("en", { month: "short", year: "2-digit" }) : period === "Quarterly" ? "Q" + (Math.floor(date.getMonth() / 3) + 1) + " " + date.getFullYear() : String(date.getFullYear());
    return { label, value: records.length ? records.reduce((sum, row) => sum + row.value, 0) : null };
  });
}

export default function AdminAnalyticsPage({ onNavigate, onLogout }) {
  const [period, setPeriod] = useState("Monthly");
  const [month, setMonth] = useState("2026-05");
  const series = seriesFor(period, month);
  const max = Math.max(10000, ...series.map((point) => point.value || 0));
  const ceiling = Math.ceil(max / 20000) * 20000;
  const exportReport = () => {
    const csv = "Period,Collected revenue (PHP)\n" + series.map((point) => point.label + "," + (point.value ?? "")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url; link.download = "revenue-" + period.toLowerCase() + "-" + month + ".csv";
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <main className="flex min-h-screen bg-[#f6f9fd]">
    <AdminSidebar activePage="Analytics & Reports" onNavigate={onNavigate} />
    <div className="min-w-0 flex-1">
      <AdminHeader onLogout={onLogout} />
      <div className="analytics-page">
        <header className="analytics-heading">
          <div><p className="analytics-eyebrow">PROPERTY PERFORMANCE</p><h1>Analytics & Reports</h1><p className="analytics-muted">A closer look at collections, room availability, and payment follow-up.</p></div>
        </header>
        <div className="analytics-toolbar">
          <div className="analytics-segments" aria-label="Revenue grouping">{["Monthly", "Quarterly", "Yearly"].map((item) => <button key={item} type="button" aria-pressed={period === item} onClick={() => setPeriod(item)}>{item}</button>)}</div>
          <div className="analytics-controls"><label>Through <input type="month" aria-label="Report ending month" value={month} onChange={(event) => { if (/^\d{4}-\d{2}$/.test(event.target.value)) setMonth(event.target.value); }} /></label><button type="button" className="analytics-export" onClick={exportReport}><Download size={16} />Export CSV</button></div>
        </div>
        <section className="analytics-panel analytics-revenue">
          <div className="analytics-panel-heading"><div><h2>Revenue trend</h2><p>{period} collections · grouped through the selected month</p></div><span className="analytics-legend"><i />Collected revenue</span></div>
          <div className="analytics-chart-scroll">
            <div className="analytics-chart">
              <div className="analytics-axis">{[1, .75, .5, .25, 0].map((tick) => <span key={tick}>{money(ceiling * tick)}</span>)}</div>
              <div className="analytics-plot">
                <div className="analytics-gridlines">{[0, 1, 2, 3, 4].map((line) => <span key={line} />)}</div>
                {series.map((point) => <div className="analytics-column" key={point.label}>
                  <div className="analytics-bar-space"><div className="analytics-bar" style={{ height: ((point.value || 0) / ceiling * 100) + "%" }} title={point.label + ": " + (point.value === null ? "No data" : money(point.value))} /></div>
                  <span className="analytics-bar-value">{point.value === null ? "No data" : money(point.value)}</span><span className="analytics-bar-label">{point.label}</span>
                </div>)}
              </div>
            </div>
          </div>
          <p className="analytics-footnote">Missing periods are marked “No data”; quarterly and yearly totals include available months only.</p>
        </section>
        <div className="analytics-breakdowns">
          <section className="analytics-panel">
            <div className="analytics-panel-heading"><div><h2>Room availability</h2><p>Current inventory · all buildings</p></div></div>
            <div className="analytics-occupancy-visual">
              <div className="analytics-donut" role="img" aria-label="50 percent occupied, 30 percent available, 10 percent reserved, 10 percent maintenance"><div><strong>50%</strong><span>occupied</span></div></div>
              <div><p className="analytics-eyebrow">ROOM MIX</p><p className="analytics-occupancy-caption">Space for your<br />next residents.</p><p className="analytics-muted">3 available · 1 reserved</p></div>
            </div>
            <div className="analytics-rows">{inventory.map(([label, count, color]) => <div key={label}><span><i style={{ background: color }} />{label}</span><strong>{count} <small>rooms</small></strong><span className="analytics-percent">{count * 10}%</span></div>)}</div>
          </section>
          <section className="analytics-panel">
            <div className="analytics-panel-heading"><div><h2>Payment distribution</h2><p>May 2026 · 10 rent bills</p></div></div>
            <div className="analytics-payment-bars">{payments.map(([label, count, color]) => <div key={label}><span>{label}</span><div><i style={{ width: count * 10 + "%", background: color }} /></div><strong>{count}</strong></div>)}</div>
            <p className="analytics-footnote">Pending and late bills need follow-up. Review individual balances in Billing.</p>
          </section>
        </div>
        <section className="analytics-panel analytics-followup"><div><p className="analytics-eyebrow">FOLLOW-UP</p><h2>From insight to action</h2><p className="analytics-muted">Review bills and available rooms.</p></div><button type="button" onClick={() => onNavigate("Billing")}><span><strong>Review unpaid bills</strong><small>2 pending · 2 late</small></span><ArrowUpRight size={20} /></button><button type="button" onClick={() => onNavigate("Rooms")}><span><strong>Review available rooms</strong><small>3 rooms ready for assignment</small></span><ArrowUpRight size={20} /></button></section>
      </div>
    </div>
  </main>;
}
