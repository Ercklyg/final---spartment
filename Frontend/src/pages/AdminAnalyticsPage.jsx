

import { useState } from "react";
import { ArrowUpRight, Download } from "lucide-react";
import AdminHeader from "../components/admin/AdminHeader.jsx";
import AdminSidebar from "../components/admin/AdminSidebar.jsx";
import "./AdminAnalyticsPage.css";

const revenue=[40000,48000,54000,57000,62000,66000];
const projectedRevenue=[45000,50000,55000,60000,65000,65000];
const inventory=[["Occupied",5,"#2563eb"],["Available",3,"#10b981"],["Reserved",1,"#f59e0b"],["Maintenance",1,"#94a3b8"]];
const payments=[["Paid",6,"#10b981"],["Pending",2,"#f59e0b"],["Late",2,"#f43f5e"]];
const tenantPayments=[
  ["Maria Santos","101",6500,6500,"Paid"], ["Juan Dela Cruz","103",6500,3250,"Partially paid"], ["Andrea Lim","105",6500,6500,"Paid"], ["Miguel Tan","201",6500,0,"Overdue"], ["Isabella Cruz","203",6500,6500,"Paid"]
];
const history=revenue.map((value,index)=>({date:new Date(2025,11+index,1),value}));
// Follow-up priorities from this sample snapshot, not probabilities of default.
const paymentRisks = tenantPayments.map(([name, room, billed, paid, status]) => {
  const balance = Math.max(0, billed - paid);
  const risk = balance === 0 ? "Low" : status === "Overdue" ? "High" : "Medium";
  const reason = balance === 0 ? "Current sample bill is fully paid." : status === "Overdue" ? "Unpaid balance is marked overdue." : "An outstanding balance remains; overdue status is not recorded.";
  return { name, room, balance, risk, reason, overdue: status === "Overdue" ? balance : 0 };
});
const overdueExposure = paymentRisks.reduce((sum, row) => sum + row.overdue, 0);
const outstandingExposure = paymentRisks.reduce((sum, row) => sum + row.balance, 0);
const availableRooms = inventory.find(([status]) => status === "Available")[1];
const vacancyGap = availableRooms * 6500;
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
  const forecastMonths = seriesFor("Monthly", month).slice(-3);
  const forecastAvailable = forecastMonths.every(point => point.value !== null);
  const forecast = forecastAvailable ? forecastMonths.reduce((sum, point) => sum + point.value, 0) / 3 : null;
  const [selectedYear, selectedMonth] = month.split("-").map(Number);
  const forecastLabel = new Date(selectedYear, selectedMonth, 1).toLocaleDateString("en", { month: "long", year: "numeric" });
  const incomeComparison = series.map((point,index) => ({ ...point, projected: period === "Monthly" ? projectedRevenue[index] : point.value === null ? null : Math.round(point.value * 1.08) }));
  const projectedTotal = incomeComparison.reduce((sum, point) => sum + (point.projected || 0), 0);
  const actualTotal = incomeComparison.reduce((sum, point) => sum + (point.value || 0), 0);
  const variance = actualTotal - projectedTotal;
  const max = Math.max(10000, ...series.map((point) => point.value || 0));
  const ceiling = Math.ceil(max / 20000) * 20000;
  const exportReport = () => {
    const csv = "FINANCIAL REPORT\nPeriod,Projected income (PHP),Actual income (PHP),Variance (PHP)\n" + incomeComparison.map((point) => point.label + "," + (point.projected ?? "") + "," + (point.value ?? "") + "," + ((point.value ?? 0) - (point.projected ?? 0))).join("\n") + "\n\nTENANT PAYMENT ANALYSIS\nTenant,Room,Billed (PHP),Paid (PHP),Balance (PHP),Status\n" + tenantPayments.map(([name,room,billed,paid,status]) => `${name},${room},${billed},${paid},${billed-paid},${status}`).join("\n");
    const forecastCsv = "\n\nTHREE-MONTH MOVING-AVERAGE FORECAST (SAMPLE DATA)\nSource month,Collected revenue (PHP)\n"
      + forecastMonths.map(point => `${point.label},${point.value ?? ""}`).join("\n")
      + `\nForecast month,Forecast collections (PHP),Method\n${forecastLabel},${forecast === null ? "" : forecast.toFixed(2)},${forecast === null ? "Insufficient data: three consecutive months required" : "Average of three months through selected month"}\n`;
    const riskCsv = "\n\nPAYMENT RISK AND POTENTIAL REVENUE LOSS ANALYSIS - MAY 2026 SAMPLE SNAPSHOT\nTenant,Room,Outstanding balance (PHP),Overdue balance (PHP),Follow-up risk,Reason\n"
      + paymentRisks.map(row => `${row.name},${row.room},${row.balance},${row.overdue},${row.risk},${row.reason}`).join("\n")
      + `\n\nMetric,Amount (PHP),Basis\nOutstanding rent,${outstandingExposure},Five sample tenant bills\nOverdue rent exposure,${overdueExposure},Subset of outstanding rent; not confirmed loss\nPotential monthly vacancy gap,${vacancyGap},${availableRooms} available rooms x PHP 6500 assuming a full month vacant; excludes reserved and maintenance rooms\n`;
    const url = URL.createObjectURL(new Blob([csv + forecastCsv + riskCsv], { type: "text/csv;charset=utf-8;" }));
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
        <section className="analytics-panel analytics-income-comparison" aria-labelledby="forecast-heading">
          <div className="analytics-panel-heading"><div><h2 id="forecast-heading">Three-month moving-average forecast</h2><p>Estimated collections for {forecastLabel} · sample data</p></div></div>
          <div className="analytics-income-summary">{forecastMonths.map(point => <div key={point.label}><span>{point.label} collections</span><strong>{point.value === null ? "No data" : money(point.value)}</strong></div>)}</div>
          <p className="analytics-muted">Forecast for {forecastLabel}</p>
          <p className="text-3xl font-bold text-blue-700" aria-live="polite">{forecast === null ? "Insufficient data" : money(forecast)}</p>
          <p className="analytics-footnote">{forecast === null
            ? "A forecast requires collections for all three consecutive months ending in the selected month. Missing months are not treated as zero."
            : `(${forecastMonths.map(point => money(point.value)).join(" + ")}) ÷ 3 = ${money(forecast)} (rounded).`}</p>
          <p className="analytics-footnote">Estimates next month's collections from recent history; it is not the rent owed or a guaranteed income target. Uses monthly data regardless of the revenue grouping above. Sample history is available from December 2025 through May 2026.</p>
        </section>
        <section className="analytics-panel analytics-income-comparison">
          <div className="analytics-panel-heading"><div><h2>Projected and actual income comparison</h2><p>{period} income target against collected rent</p></div><span className={variance >= 0 ? "analytics-positive" : "analytics-negative"}>{variance >= 0 ? "+" : ""}{money(variance)} variance</span></div>
          <div className="analytics-income-summary"><div><span>Projected income</span><strong>{money(projectedTotal)}</strong></div><div><span>Actual income</span><strong>{money(actualTotal)}</strong></div><div><span>Collection rate</span><strong>{projectedTotal ? Math.round(actualTotal / projectedTotal * 100) : 0}%</strong></div></div>
          <div className="analytics-comparison-list">{incomeComparison.map(point => <div key={point.label}><span>{point.label}</span><div><i className="analytics-projected" style={{width: `${Math.min(100, (point.projected || 0) / Math.max(projectedTotal / 6, 1) * 100)}%`}} /><i className="analytics-actual" style={{width: `${Math.min(100, (point.value || 0) / Math.max(projectedTotal / 6, 1) * 100)}%`}} /></div><strong>{point.value === null ? "No data" : `${money(point.value)} / ${money(point.projected)}`}</strong></div>)}</div>
          <p className="analytics-footnote"><span className="analytics-key analytics-projected" /> Projected &nbsp; <span className="analytics-key analytics-actual" /> Actual collections</p>
        </section>
        <section className="analytics-panel analytics-tenant-analysis" aria-labelledby="payment-risk-heading">
          <div className="analytics-panel-heading"><div><h2 id="payment-risk-heading">Tenant payment risk and potential revenue loss analysis</h2><p>May 2026 sample snapshot · five tenant bills and current sample room inventory</p></div></div>
          <p className="analytics-footnote">This snapshot stays fixed when the report period changes. Ratings indicate payment follow-up priority based on the sample bill status, not an AI prediction or a tenant's creditworthiness.</p>
          <div className="analytics-income-summary">
            <div><span>Outstanding rent</span><strong>{money(outstandingExposure)}</strong><p className="analytics-muted">Total unpaid balance across the five sample bills.</p></div>
            <div><span>Overdue rent exposure</span><strong>{money(overdueExposure)}</strong><p className="analytics-muted">Included in outstanding rent; collection is still possible.</p></div>
            <div><span>Potential monthly vacancy gap</span><strong>{money(vacancyGap)}</strong><p className="analytics-muted">{availableRooms} available rooms × ₱6,500 if vacant for a full month.</p></div>
          </div>
          <div className="analytics-table-scroll"><table><caption className="sr-only">Payment follow-up risk and reasons for each sample tenant</caption><thead><tr><th scope="col">Tenant / Room</th><th scope="col">Balance</th><th scope="col">Risk</th><th scope="col">Reason</th></tr></thead><tbody>{paymentRisks.map(row => <tr key={row.room}><td>{row.name}<p className="text-sm text-slate-500">Room {row.room}</p></td><td>{money(row.balance)}</td><td><span className={`analytics-payment-status ${row.risk === "High" ? "overdue" : row.risk === "Medium" ? "partially-paid" : "paid"}`}>{row.risk}</span></td><td>{row.reason}</td></tr>)}</tbody></table></div>
          <p className="analytics-footnote">Rules: High = overdue balance; Medium = other outstanding balance; Low = fully paid current bill. No historical payment behavior is assumed. Vacancy estimates exclude reserved and maintenance rooms. Overdue rent is not confirmed lost revenue, and the vacancy gap is an opportunity estimate, so these figures are shown separately.</p>
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
        <section className="analytics-panel analytics-tenant-analysis"><div className="analytics-panel-heading"><div><h2>Tenant payment analysis</h2><p>Current rent payment performance by tenant</p></div><button type="button" onClick={() => onNavigate("Billing")}>View billing</button></div><div className="analytics-table-scroll"><table><thead><tr><th>Tenant</th><th>Room</th><th>Billed</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead><tbody>{tenantPayments.map(([name,room,billed,paid,status]) => <tr key={room}><td>{name}</td><td>{room}</td><td>{money(billed)}</td><td>{money(paid)}</td><td className={billed-paid ? "analytics-balance" : ""}>{money(billed-paid)}</td><td><span className={`analytics-payment-status ${status.toLowerCase().replace(" ", "-")}`}>{status}</span></td></tr>)}</tbody></table></div></section>
        <section className="analytics-panel analytics-followup"><div><p className="analytics-eyebrow">FOLLOW-UP</p><h2>From insight to action</h2><p className="analytics-muted">Review bills and available rooms.</p></div><button type="button" onClick={() => onNavigate("Billing")}><span><strong>Review unpaid bills</strong><small>2 pending · 2 late</small></span><ArrowUpRight size={20} /></button><button type="button" onClick={() => onNavigate("Rooms")}><span><strong>Review available rooms</strong><small>3 rooms ready for assignment</small></span><ArrowUpRight size={20} /></button></section>
      </div>
    </div>
  </main>;
}
