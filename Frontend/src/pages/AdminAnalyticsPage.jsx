import PageSkeleton from "../components/PageSkeleton.jsx";
import { showFeedback } from "../lib/actionFeedback.js";
import { api } from '../lib/api.js';
import { useCallback, useState } from "react";
import { useSessionState } from "../lib/useSessionState.js";
import { ArrowUpRight, Download } from "lucide-react";
import AdminHeader from "../components/admin/AdminHeader.jsx";
import AdminSidebar from "../components/admin/AdminSidebar.jsx";
import { loadAdminAnalytics } from "../lib/adminAnalytics.js";
import { generateAnalyticsPdf } from "../lib/analyticsPdf.js";
import { money, today } from "../lib/billing.js";
import { useRemoteData } from "../lib/useRemoteData.js";
import "./AdminAnalyticsPage.css";

const roomColors = { occupied: "#2563eb", available: "#10b981", reserved: "#f59e0b", maintenance: "#94a3b8" };
const periodLabel = value => /^\d{4}-\d{2}$/.test(value)
  ? new Date(value + "-01T12:00:00").toLocaleDateString("en-PH", { month: "short", year: "2-digit" }) : value;
const buildingNames = room => (room || "Unassigned").split(", ").map(value => value === "Unassigned" ? value : value.split(" / ")[0]);

function PaymentStatus({ status }) {
  const tone = status === "Late" ? "overdue" : status === "Paid" ? "paid" : "partially-paid";
  return <span className={"analytics-payment-status " + tone}>{status}</span>;
}

const TABLE_PAGE_SIZE = 5;
function TablePagination({ count, page, pageCount, onPageChange, label }) {
  if (count <= TABLE_PAGE_SIZE) return null;
  const first = (page - 1) * TABLE_PAGE_SIZE + 1;
  const last = Math.min(page * TABLE_PAGE_SIZE, count);
  return <nav className="analytics-table-pagination" aria-label={label}>
    <span>Showing {first}–{last} of {count}</span>
    <div>
      <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>Previous</button>
      <span aria-live="polite">Page {page} of {pageCount}</span>
      <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount}>Next</button>
    </div>
  </nav>;
}

function AnalyticsReport({ data, month, period, onNavigate }) {
  const { snapshot, series, forecast, forecastMonths, comparison } = data;
  const collectionHealth = snapshot.collectionHealth || { aging: [], dueBillCount: 0, onTimeBillCount: 0, onTimeRate: 0, collectionRate: 0, repeatLatePayers: [] };
  const ceiling = Math.max(1, ...series.map(point => point.value));
  const comparisonCeiling = Math.max(1, ...series.flatMap(point => [point.billed, point.value]));
  const [year, selectedMonth] = month.split("-").map(Number);
  const forecastLabel = new Date(year, selectedMonth, 1).toLocaleDateString("en-PH", { month: "long", year: "numeric" });
  const billStatusTotals = [
    { label: "Paid", status: "Paid" },
    { label: "Partially paid", status: "Partially paid" },
    { label: "Outstanding", status: "Pending" },
    { label: "Overdue", status: "Late" },
  ].map(group => {
    const bills = snapshot.selected.filter(bill => bill.status === group.status);
    return {
      ...group,
      count: bills.length,
      billed: bills.reduce((sum, bill) => sum + Number(bill.total || 0), 0),
      collected: bills.reduce((sum, bill) => sum + Number(bill.paid || 0), 0),
      balance: bills.reduce((sum, bill) => sum + Number(bill.balance || 0), 0),
    };
  });
  const billStatusTotal = billStatusTotals.reduce((total, row) => ({
    count: total.count + row.count,
    billed: total.billed + row.billed,
    collected: total.collected + row.collected,
    balance: total.balance + row.balance,
  }), { count: 0, billed: 0, collected: 0, balance: 0 });
  const roomCount = data.roomCount;
  const [outstandingPage, setOutstandingPage] = useState(1);
  const [riskPage, setRiskPage] = useState(1);
  const [outstandingBuilding, setOutstandingBuilding] = useState("All");
  const [riskBuilding, setRiskBuilding] = useState("All");
  // Angles and widths are presentation values; balances and totals come from the backend.
  const donut = snapshot.inventory.map((item, index, inventory) => {
    const start = inventory.slice(0, index).reduce((sum, row) => sum + row.count, 0);
    return roomColors[item.status] + " " + (start / roomCount * 100) + "% " + ((start + item.count) / roomCount * 100) + "%";
  }).join(", ");
  const outstanding = snapshot.rows.filter(bill => bill.balance > 0);
  const repeatLatePayers = collectionHealth.repeatLatePayers || [];
  const allRoomValues = [...snapshot.rows, ...snapshot.selected, ...repeatLatePayers].map(item => item.room);
  const buildingOptions = [...new Set(allRoomValues.flatMap(buildingNames))].sort((a, b) => a.localeCompare(b));
  const filteredOutstanding = outstanding.filter(bill => outstandingBuilding === "All" || buildingNames(bill.room).includes(outstandingBuilding));
  const filteredRiskTenants = repeatLatePayers.filter(tenant => riskBuilding === "All" || buildingNames(tenant.room).includes(riskBuilding));
  const outstandingPageCount = Math.max(1, Math.ceil(filteredOutstanding.length / TABLE_PAGE_SIZE));
  const riskPageCount = Math.max(1, Math.ceil(filteredRiskTenants.length / TABLE_PAGE_SIZE));
  const currentOutstandingPage = Math.min(outstandingPage, outstandingPageCount);
  const currentRiskPage = Math.min(riskPage, riskPageCount);
  const visibleOutstanding = filteredOutstanding.slice((currentOutstandingPage - 1) * TABLE_PAGE_SIZE, currentOutstandingPage * TABLE_PAGE_SIZE);
  const visibleRiskTenants = filteredRiskTenants.slice((currentRiskPage - 1) * TABLE_PAGE_SIZE, currentRiskPage * TABLE_PAGE_SIZE);

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
      <div className="analytics-panel-heading"><div><h2 id="payment-followup-heading">Outstanding balances &amp; follow-up</h2><p>{filteredOutstanding.length} bills · saved through {snapshot.cutoff}</p></div><div className="analytics-table-actions"><label>Building<select aria-label="Filter outstanding balances by building" value={outstandingBuilding} onChange={event => setOutstandingBuilding(event.target.value)}><option value="All">All buildings</option>{buildingOptions.map(building => <option key={building} value={building}>{building}</option>)}</select></label><button type="button" onClick={() => onNavigate?.("Billing")}>View billing</button></div></div>
      <div className="analytics-income-summary">
        <div><span>Outstanding balance</span><strong>{money(snapshot.outstanding)}</strong><p className="analytics-muted">Unpaid rent and utility balances.</p></div>
        <div><span>Overdue balance</span><strong>{money(snapshot.overdue)}</strong><p className="analytics-muted">Included in the outstanding balance.</p></div>
        <div><span>Potential monthly vacancy gap</span><strong>{money(snapshot.vacancyGap)}</strong><p className="analytics-muted">Monthly rates for {snapshot.available} currently available rooms.</p></div>
      </div>
      <div className="analytics-table-scroll analytics-table-compact" role="region" aria-label="Outstanding bills table" tabIndex={0}><table><caption className="sr-only">Outstanding bills and payment follow-up</caption><thead><tr><th>Tenant / Room</th><th>Bill</th><th>Balance</th><th>Status</th><th>Follow-up</th></tr></thead>
        <tbody>{visibleOutstanding.map(bill => <tr key={bill.id}><td>{bill.name}<p className="analytics-muted">{bill.room}</p></td><td>{bill.bill_type} / {bill.billing_period.slice(0, 7)}</td><td className="analytics-balance">{money(bill.balance)}</td><td><PaymentStatus status={bill.status} /></td><td>{bill.status === "Late" ? "Follow up on overdue balance" : "Monitor the due date"}</td></tr>)}
          {!filteredOutstanding.length && <tr><td colSpan={5}>{outstandingBuilding === "All" ? "No outstanding balances in this snapshot." : "No outstanding bills for this building."}</td></tr>}
        </tbody>
      </table></div>
      <TablePagination count={filteredOutstanding.length} page={currentOutstandingPage} pageCount={outstandingPageCount} onPageChange={setOutstandingPage} label="Outstanding bills pages" />
      <p className="analytics-footnote">Overdue balances may still be collected. The vacancy figure is potential monthly rent from currently available rooms; reserved and maintenance rooms are excluded.</p>
    </section>

    <section className="analytics-panel analytics-collection-health" aria-labelledby="collection-health-heading">
      <div className="analytics-panel-heading"><div><h2 id="collection-health-heading">Collections aging and payment punctuality</h2><p>Balances and payment timing through {snapshot.cutoff}</p></div></div>
      <div className="analytics-income-summary">
        <div><span>Collection rate</span><strong>{Number(collectionHealth.collectionRate || 0).toFixed(1)}%</strong><p className="analytics-muted">Recorded payments ÷ bills issued through the report date.</p></div>
        <div><span>On-time payment rate</span><strong>{Number(collectionHealth.onTimeRate || 0).toFixed(1)}%</strong><p className="analytics-muted">{collectionHealth.onTimeBillCount} of {collectionHealth.dueBillCount} due bills were fully paid by their due date.</p></div>
        <div><span>Over 30 days overdue</span><strong>{money(collectionHealth.aging.filter(bucket => /^(31-60|61\+)/.test(bucket.label)).reduce((sum, bucket) => sum + Number(bucket.balance || 0), 0))}</strong><p className="analytics-muted">Prioritize these balances for follow-up.</p></div>
      </div>
      <div className="analytics-aging-grid">{collectionHealth.aging.map(bucket => <div key={bucket.label}><span>{bucket.label}</span><strong>{money(bucket.balance)}</strong><small>{bucket.billCount} {bucket.billCount === 1 ? "bill" : "bills"}</small></div>)}</div>
      <p className="analytics-footnote">A bill is on time only when its full amount was recorded by its due date. The tenant risk list below counts bills paid late as well as unpaid late bills.</p>
    </section>

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

    <section className="analytics-panel" aria-labelledby="bill-status-heading">
      <div className="analytics-panel-heading"><div><h2 id="bill-status-heading">Bill status totals</h2><p>{periodLabel(month)} · {snapshot.selected.length} rent and utility bills · status as of {snapshot.cutoff}</p></div></div>
      <div className="analytics-table-scroll analytics-table-compact" role="region" aria-label="Bill status totals table" tabIndex={0}>
        <table>
          <caption className="sr-only">Billed, collected, and remaining amounts for each bill status in {periodLabel(month)}</caption>
          <thead><tr><th>Status</th><th>Bill count</th><th>Billed</th><th>Collected</th><th>Remaining balance</th></tr></thead>
          <tbody>{billStatusTotals.map(row => <tr key={row.label}>
            <td>{row.label === "Outstanding" ? "Outstanding (not overdue)" : row.label}</td>
            <td>{row.count}</td>
            <td>{money(row.billed)}</td>
            <td>{money(row.collected)}</td>
            <td className={row.balance ? "analytics-balance" : ""}>{money(row.balance)}</td>
          </tr>)}</tbody>
          <tfoot><tr><th>Total</th><th>{billStatusTotal.count}</th><th>{money(billStatusTotal.billed)}</th><th>{money(billStatusTotal.collected)}</th><th>{money(billStatusTotal.balance)}</th></tr></tfoot>
        </table>
      </div>
      <p className="analytics-footnote">Outstanding here means unpaid bills that are not yet overdue; overdue is shown separately. Partially paid bills show both the amount collected and the remaining balance.</p>
    </section>

    <section className="analytics-panel analytics-tenant-analysis analytics-risk-analysis" aria-labelledby="tenant-risk-heading">
      <div className="analytics-panel-heading">
        <div><h2 id="tenant-risk-heading">Tenant payment risk</h2><p>Top 10 · 2+ late bills in the last 6 months · {filteredRiskTenants.length} shown</p></div>
        <div className="analytics-table-actions"><label>Building<select aria-label="Filter tenant payment risk by building" value={riskBuilding} onChange={event => setRiskBuilding(event.target.value)}><option value="All">All buildings</option>{buildingOptions.map(building => <option key={building} value={building}>{building}</option>)}</select></label></div>
      </div>
      <div className="analytics-table-scroll analytics-table-compact" role="region" aria-label="Tenant payment risk table" tabIndex={0}><table><caption className="sr-only">Tenants with at least two late bills in the last six months</caption><thead><tr><th>Tenant / Room</th><th>Late bills (6 months)</th><th>Current overdue balance</th><th>Risk status</th><th>Suggested follow-up</th></tr></thead>
        <tbody>{visibleRiskTenants.map(tenant => <tr key={tenant.tenantId}><td>{tenant.name}<p className="analytics-muted">{tenant.room}</p></td><td>{tenant.lateBillCount}</td><td className={Number(tenant.overdueBalance) ? "analytics-balance" : ""}>{money(tenant.overdueBalance)}</td><td><span className="analytics-risk-badge">At risk</span></td><td>{Number(tenant.overdueBalance) ? "Discuss overdue balance" : "Monitor next due date"}</td></tr>)}
          {!filteredRiskTenants.length && <tr><td colSpan={5}>{riskBuilding === "All" ? "No tenants meet the repeated late-payment rule for this period." : "No matching tenant appears in the top 10 for this building."}</td></tr>}
        </tbody>
      </table></div>
      <TablePagination count={filteredRiskTenants.length} page={currentRiskPage} pageCount={riskPageCount} onPageChange={setRiskPage} label="Tenant payment risk pages" />
      <p className="analytics-footnote">At risk means at least two bills were paid after their due date or remain overdue in the six-month window.</p>
    </section>

    <section className="analytics-panel analytics-followup">
      <div><p className="analytics-eyebrow">FOLLOW-UP</p><h2>From insight to action</h2><p className="analytics-muted">Review available rooms.</p></div>
      <button type="button" onClick={() => onNavigate?.("Rooms")}><span><strong>Review available rooms</strong><small>{snapshot.available} rooms ready for assignment</small></span><ArrowUpRight size={20} /></button>
    </section>
    <p className="analytics-footnote">Loaded {new Date(data.loadedAt).toLocaleString("en-PH")}. Refresh to include new changes.</p>
  </>;
}

export default function AdminAnalyticsPage({ onNavigate, onLogout }) {
  const [month, setMonth] = useSessionState("admin-analytics-month",today().slice(0, 7));
  const [period, setPeriod] = useSessionState("admin-analytics-period","Monthly");
  const [exporting,setExporting]=useState(false);
  const [confirmExport,setConfirmExport]=useState(false);
  const loader = useCallback(client => loadAdminAnalytics(client, month, period), [month, period]);
  const { data, error, loading, reload } = useRemoteData(loader,{keepPrevious:true});
  const exportReport = async () => {
    if (!data||exporting) return;
    setConfirmExport(false);
    setExporting(true);
    try {
      const report = await api.get("/analytics?" + new URLSearchParams({ month, period, export: "pdf" }));
      const pdf = generateAnalyticsPdf(report, month, period);
      const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `collections-${period.toLowerCase()}-${month}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showFeedback("PDF report downloaded.", "success");
    } catch (error) {
      showFeedback(error.message, "error");
    } finally {
      setExporting(false);
    }
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
            <button type="button" disabled={!data||exporting} className="analytics-export disabled:opacity-50" onClick={() => setConfirmExport(true)}><Download size={16} />{exporting?'Preparing PDF...':'Export PDF'}</button>
          </div>
        </div>
        {loading&&!data ? <PageSkeleton variant="analytics" label="Loading analytics..."/> : error&&!data ? <p role="alert" className="text-rose-700">{error} <button onClick={reload} className="underline">Retry</button></p> : <><div aria-live="polite">{loading&&<p role="status" className="mb-3 text-sm text-blue-700">Updating analytics while keeping the current report visible…</p>}{error&&<p role="alert" className="mb-3 text-sm text-rose-700">{error} <button onClick={reload} className="underline">Retry</button></p>}{exporting&&<p role="status" className="mb-3 text-sm text-blue-700">Preparing your PDF download…</p>}</div><AnalyticsReport data={data} month={month} period={period} onNavigate={onNavigate} /></>}
      </div>
    </div>
    {confirmExport && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4">
      <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-pdf-title" aria-describedby="confirm-pdf-description" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="confirm-pdf-title" className="text-lg font-bold text-slate-900">Download analytics PDF?</h2>
        <p id="confirm-pdf-description" className="mt-2 text-sm leading-6 text-slate-600">A formatted A4 report for the {period.toLowerCase()} period ending {month} will be generated and downloaded to your device.</p>
        <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setConfirmExport(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button><button type="button" onClick={exportReport} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Download PDF</button></div>
      </section>
    </div>}
  </main>;
}
