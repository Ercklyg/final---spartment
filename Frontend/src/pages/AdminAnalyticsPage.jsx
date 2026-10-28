import PageSkeleton from "../components/PageSkeleton.jsx";
import { showFeedback } from "../lib/actionFeedback.js";
import { api } from '../lib/api.js';
import { useCallback, useState } from "react";
import { useSessionState } from "../lib/useSessionState.js";
import { Activity, ArrowUpRight, Building2, ClipboardList, Download, Info, ReceiptText, TrendingUp, TriangleAlert, Wallet } from "lucide-react";
import AdminHeader from "../components/admin/AdminHeader.jsx";
import AdminSidebar from "../components/admin/AdminSidebar.jsx";
import { loadAdminAnalytics } from "../lib/adminAnalytics.js";
import { generateAnalyticsPdf } from "../lib/analyticsPdf.js";
import { money, today } from "../lib/billing.js";
import { useRemoteData } from "../lib/useRemoteData.js";
import "./AdminAnalyticsPage.css";

const roomColors = { occupied: "#2563eb", available: "#10b981", reserved: "#f59e0b", maintenance: "#94a3b8" };
const agingColors = ["#fbbf24", "#fb923c", "#f87171", "#e11d48"];
const compactMoney = value => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", notation: "compact", maximumFractionDigits: 1 }).format(Number(value || 0));
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

function SectionHeading({ id, icon: Icon, title, subtitle, action }) {
  return <div className="analytics-panel-heading">
    <div className="analytics-heading-left">
      <span className="analytics-section-icon" aria-hidden="true"><Icon size={18} /></span>
      <div><h2 id={id}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
    </div>
    {action}
  </div>;
}

function AnalyticsReport({ data, month, period, onNavigate }) {
  const { snapshot, series, forecast, forecastMonths, comparison } = data;
  const collectionHealth = snapshot.collectionHealth || { aging: [], dueBillCount: 0, onTimeBillCount: 0, onTimeRate: 0, collectionRate: 0, repeatLatePayers: [] };
  const comparisonCeiling = Math.max(1, ...series.flatMap(point => [point.billed, point.value]));
  const forecastMax = Math.max(1, ...forecastMonths.map(point => Number(point.value || 0)));
  const [year, selectedMonth] = month.split("-").map(Number);
  const forecastLabel = new Date(year, selectedMonth, 1).toLocaleDateString("en-PH", { month: "long", year: "numeric" });
  const billStatusTotals = [
    { label: "Paid", status: "Paid", color: "#10b981" },
    { label: "Partially paid", status: "Partially paid", color: "#60a5fa" },
    { label: "Outstanding", status: "Pending", color: "#f59e0b" },
    { label: "Overdue", status: "Late", color: "#fb7185" },
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
  const collectedRate = comparison.billed ? (comparison.collected / comparison.billed) * 100 : 0;
  const overdueAging = collectionHealth.aging.filter(bucket => /^(31-60|61\+)/.test(bucket.label)).reduce((sum, bucket) => sum + Number(bucket.balance || 0), 0);
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
  const periodWord = period === "Monthly" ? "month" : period === "Quarterly" ? "quarter" : "year";

  return <>
    <div className="analytics-report-grid">
      <section className="analytics-panel analytics-revenue analytics-grid-wide" aria-labelledby="revenue-heading">
        <SectionHeading
          id="revenue-heading"
          icon={Wallet}
          title="Revenue trend"
          subtitle={`${period} billed vs. collected · through ${snapshot.cutoff}`}
          action={<div className="analytics-chart-legend" aria-label="Chart legend"><span><i className="analytics-key analytics-key-billed" />Billed</span><span><i className="analytics-key analytics-key-collected" />Collected</span></div>}
        />
        <div className="analytics-chart-scroll"><div className="analytics-chart">
          <div className="analytics-axis" aria-hidden="true">{[1, .75, .5, .25, 0].map(tick => <span key={tick}>{money(comparisonCeiling * tick)}</span>)}</div>
          <div className="analytics-plot">
            <div className="analytics-gridlines" aria-hidden="true">{[0, 1, 2, 3, 4].map(line => <span key={line} />)}</div>
            {series.map(point => <div className="analytics-column" key={point.label}>
              <div className="analytics-bar-space analytics-bar-group" role="img" aria-label={`${point.label}: billed ${money(point.billed)}, collected ${money(point.value)}`}>
                <div className="analytics-bar analytics-bar-billed" style={{ height: point.billed / comparisonCeiling * 100 + "%" }} title={"Billed: " + money(point.billed)} />
                <div className="analytics-bar analytics-bar-collected" style={{ height: point.value / comparisonCeiling * 100 + "%" }} title={"Collected: " + money(point.value)} />
              </div>
              <span className="analytics-bar-value"><span className="analytics-chart-amount-full">{money(point.value)}</span><span className="analytics-chart-amount-compact">{compactMoney(point.value)}</span></span>
              <span className="analytics-bar-label">{periodLabel(point.label)}</span>
            </div>)}
          </div>
        </div></div>
        <div className="analytics-revenue-summary">
          <div><span>Total billed</span><strong>{money(comparison.billed)}</strong></div>
          <div><span>Total collected</span><strong>{money(comparison.collected)}</strong></div>
          <div><span>Collected share</span><strong>{collectedRate.toFixed(1)}%</strong></div>
        </div>
        <p className="analytics-footnote">Bills use billing periods; collections use payment dates and may settle older bills. Collected share compares the two totals for context, not an income target. Zero means no saved payments for that period.</p>
      </section>

      <section className="analytics-panel analytics-forecast analytics-grid-narrow" aria-labelledby="forecast-heading">
        <SectionHeading id="forecast-heading" icon={TrendingUp} title="Collections forecast" subtitle={`Three-month moving average for ${forecastLabel}`} />
        <div className="analytics-forecast-value">
          <p className="analytics-eyebrow">ESTIMATED COLLECTIONS</p>
          <p className={"analytics-forecast-number" + (forecast === null ? " analytics-forecast-number--muted" : "")} aria-live="polite">{forecast === null ? "Not enough history" : money(forecast)}</p>
          <p className="analytics-muted">{forecastLabel}</p>
        </div>
        <div className="analytics-forecast-months" aria-label="Monthly collections used in the forecast">
          {forecastMonths.map(point => <div className="analytics-forecast-month" key={point.label}>
            <span>{periodLabel(point.label)}</span>
            <div className="analytics-forecast-track"><i style={{ width: (Number(point.value || 0) ? Math.max(2, Number(point.value) / forecastMax * 100) : 0) + "%" }} /></div>
            <strong>{compactMoney(point.value)}</strong>
          </div>)}
        </div>
        <p className="analytics-footnote">{forecast === null
          ? "Select a completed month with at least one saved payment in each of the three months shown to calculate an estimate."
          : "Average recorded collections for the three completed months shown above."} Uses monthly history regardless of the chart grouping. This is an estimate, not guaranteed income.</p>
      </section>

      <section className="analytics-panel analytics-tenant-analysis analytics-grid-wide" aria-labelledby="payment-followup-heading">
        <SectionHeading
          id="payment-followup-heading"
          icon={ReceiptText}
          title="Outstanding balances & follow-up"
          subtitle={`${filteredOutstanding.length} unpaid ${filteredOutstanding.length === 1 ? "bill" : "bills"} · saved through ${snapshot.cutoff}`}
          action={<div className="analytics-table-actions"><label>Building<select aria-label="Filter outstanding balances by building" value={outstandingBuilding} onChange={event => setOutstandingBuilding(event.target.value)}><option value="All">All buildings</option>{buildingOptions.map(building => <option key={building} value={building}>{building}</option>)}</select></label><button type="button" onClick={() => onNavigate?.("Billing")}>View billing</button></div>}
        />
        <div className="analytics-table-scroll analytics-table-compact analytics-desktop-table" role="region" aria-label="Outstanding bills table" tabIndex={0}><table><caption className="sr-only">Outstanding bills and payment follow-up</caption><thead><tr><th>Tenant / Room</th><th>Bill</th><th className="analytics-numeric">Balance</th><th>Status</th><th>Follow-up</th></tr></thead>
          <tbody>{visibleOutstanding.map(bill => <tr key={bill.id}><td>{bill.name}<p className="analytics-muted">{bill.room}</p></td><td>{bill.bill_type} / {bill.billing_period.slice(0, 7)}</td><td className="analytics-balance analytics-numeric">{money(bill.balance)}</td><td><PaymentStatus status={bill.status} /></td><td>{bill.status === "Late" ? "Follow up on overdue balance" : "Monitor the due date"}</td></tr>)}
            {!filteredOutstanding.length && <tr><td colSpan={5}>{outstandingBuilding === "All" ? "No outstanding balances in this snapshot." : "No outstanding bills for this building."}</td></tr>}
          </tbody>
        </table></div>
        <ul className="analytics-mobile-list" aria-label="Outstanding bills">
          {visibleOutstanding.map(bill => <li key={bill.id} className="analytics-mobile-card">
            <div className="analytics-mobile-card-head">
              <div className="min-w-0"><p className="analytics-mobile-card-title">{bill.name}</p><p className="analytics-mobile-card-subtitle">{bill.room}</p></div>
              <PaymentStatus status={bill.status} />
            </div>
            <dl className="analytics-mobile-card-fields">
              <div><dt>Bill</dt><dd>{bill.bill_type} · {bill.billing_period.slice(0, 7)}</dd></div>
              <div><dt>Balance</dt><dd className="analytics-balance">{money(bill.balance)}</dd></div>
              <div className="analytics-mobile-card-wide"><dt>Follow-up</dt><dd>{bill.status === "Late" ? "Follow up on overdue balance" : "Monitor the due date"}</dd></div>
            </dl>
          </li>)}
          {!filteredOutstanding.length && <li className="analytics-mobile-empty">{outstandingBuilding === "All" ? "No outstanding balances in this snapshot." : "No outstanding bills for this building."}</li>}
        </ul>
        <TablePagination count={filteredOutstanding.length} page={currentOutstandingPage} pageCount={outstandingPageCount} onPageChange={setOutstandingPage} label="Outstanding bills pages" />
        <p className="analytics-footnote">Overdue amounts may still be collected. The outstanding total includes unpaid and partially paid bills throughout the reporting snapshot.</p>
      </section>

      <section className="analytics-panel analytics-collection-health analytics-grid-narrow" aria-labelledby="collection-health-heading">
        <SectionHeading id="collection-health-heading" icon={Activity} title="Collection health" subtitle={`Aging and payment timing through ${snapshot.cutoff}`} />
        <div className="analytics-health-rates">
          <div className="analytics-rate-card">
            <div className="analytics-rate-ring" style={{ background: `conic-gradient(#059669 ${Math.min(100, Number(collectionHealth.onTimeRate || 0))}%, #e2e8f0 0)` }} role="img" aria-label={`On-time payment rate: ${Number(collectionHealth.onTimeRate || 0).toFixed(1)}%`}><span>{Number(collectionHealth.onTimeRate || 0).toFixed(1)}%</span></div>
            <p>On-time payments</p>
            <small>{collectionHealth.onTimeBillCount || 0} of {collectionHealth.dueBillCount || 0} due bills fully paid on time</small>
          </div>
          <div className="analytics-rate-card">
            <div className="analytics-rate-ring" style={{ background: `conic-gradient(#2563eb ${Math.min(100, Number(collectionHealth.collectionRate || 0))}%, #e2e8f0 0)` }} role="img" aria-label={`Collection rate: ${Number(collectionHealth.collectionRate || 0).toFixed(1)}%`}><span>{Number(collectionHealth.collectionRate || 0).toFixed(1)}%</span></div>
            <p>Collection rate</p>
            <small>Recorded payments ÷ bills issued through the report date</small>
          </div>
        </div>

        <p className="analytics-subheading">Aging balances</p>
        <div className="analytics-aging-bar" role="img" aria-label={collectionHealth.aging.map(bucket => `${bucket.label}: ${money(bucket.balance)}`).join(", ")}>
          {collectionHealth.aging.map((bucket, index) => Number(bucket.balance) > 0 ? <span key={bucket.label} style={{ flexGrow: Number(bucket.balance || 0), background: agingColors[index % agingColors.length] }} title={`${bucket.label}: ${money(bucket.balance)}`} /> : null)}
        </div>
        <ul className="analytics-aging-legend">
          {collectionHealth.aging.map((bucket, index) => <li key={bucket.label}>
            <i style={{ background: agingColors[index % agingColors.length] }} />
            <span>{bucket.label}</span>
            <strong>{money(bucket.balance)}</strong>
            <small>{bucket.billCount} {bucket.billCount === 1 ? "bill" : "bills"}</small>
          </li>)}
        </ul>
        <div className="analytics-overdue-alert">
          <span>Over 30 days overdue</span>
          <strong>{money(overdueAging)}</strong>
        </div>
        <p className="analytics-footnote">A bill is on time only when its full amount was recorded by its due date. Over-30-day balances should be prioritized for follow-up.</p>
      </section>

      <section className="analytics-panel analytics-tenant-analysis analytics-risk-analysis analytics-grid-wide" aria-labelledby="tenant-risk-heading">
        <SectionHeading
          id="tenant-risk-heading"
          icon={TriangleAlert}
          title="Tenant payment risk"
          subtitle={`Top 10 · 2+ late bills in the last 6 months · ${filteredRiskTenants.length} shown`}
          action={<div className="analytics-table-actions"><label>Building<select aria-label="Filter tenant payment risk by building" value={riskBuilding} onChange={event => setRiskBuilding(event.target.value)}><option value="All">All buildings</option>{buildingOptions.map(building => <option key={building} value={building}>{building}</option>)}</select></label></div>}
        />
        <div className="analytics-table-scroll analytics-table-compact analytics-desktop-table" role="region" aria-label="Tenant payment risk table" tabIndex={0}><table><caption className="sr-only">Tenants with at least two late bills in the last six months</caption><thead><tr><th>Tenant / Room</th><th className="analytics-numeric">Late bills (6 months)</th><th className="analytics-numeric">Current overdue balance</th><th>Risk status</th><th>Suggested follow-up</th></tr></thead>
          <tbody>{visibleRiskTenants.map(tenant => <tr key={tenant.tenantId}><td>{tenant.name}<p className="analytics-muted">{tenant.room}</p></td><td className="analytics-numeric">{tenant.lateBillCount}</td><td className={Number(tenant.overdueBalance) ? "analytics-balance analytics-numeric" : "analytics-numeric"}>{money(tenant.overdueBalance)}</td><td><span className="analytics-risk-badge">At risk</span></td><td>{Number(tenant.overdueBalance) ? "Discuss overdue balance" : "Monitor next due date"}</td></tr>)}
            {!filteredRiskTenants.length && <tr><td colSpan={5}>{riskBuilding === "All" ? "No tenants meet the repeated late-payment rule for this period." : "No matching tenant appears in the top 10 for this building."}</td></tr>}
          </tbody>
        </table></div>
        <ul className="analytics-mobile-list" aria-label="Tenant payment risk">
          {visibleRiskTenants.map(tenant => <li key={tenant.tenantId} className="analytics-mobile-card">
            <div className="analytics-mobile-card-head">
              <div className="min-w-0"><p className="analytics-mobile-card-title">{tenant.name}</p><p className="analytics-mobile-card-subtitle">{tenant.room}</p></div>
              <span className="analytics-risk-badge">At risk</span>
            </div>
            <dl className="analytics-mobile-card-fields">
              <div><dt>Late bills (6 months)</dt><dd>{tenant.lateBillCount}</dd></div>
              <div><dt>Current overdue balance</dt><dd className={Number(tenant.overdueBalance) ? "analytics-balance" : ""}>{money(tenant.overdueBalance)}</dd></div>
              <div className="analytics-mobile-card-wide"><dt>Suggested follow-up</dt><dd>{Number(tenant.overdueBalance) ? "Discuss overdue balance" : "Monitor next due date"}</dd></div>
            </dl>
          </li>)}
          {!filteredRiskTenants.length && <li className="analytics-mobile-empty">{riskBuilding === "All" ? "No tenants meet the repeated late-payment rule for this period." : "No matching tenant appears in the top 10 for this building."}</li>}
        </ul>
        <TablePagination count={filteredRiskTenants.length} page={currentRiskPage} pageCount={riskPageCount} onPageChange={setRiskPage} label="Tenant payment risk pages" />
        <p className="analytics-footnote">At risk means at least two bills were paid after their due date or remain overdue in the six-month window.</p>
      </section>

      <section className="analytics-panel analytics-status analytics-grid-narrow" aria-labelledby="bill-status-heading">
        <SectionHeading id="bill-status-heading" icon={ClipboardList} title="Bill status" subtitle={`${periodLabel(month)} · ${snapshot.selected.length} bills · as of ${snapshot.cutoff}`} />
        <div className="analytics-status-bar" role="img" aria-label={billStatusTotals.map(row => `${row.label}: ${row.count} bills`).join(", ")}>
          {billStatusTotals.filter(row => row.count > 0).map(row => <span key={row.label} style={{ flexGrow: row.count, background: row.color }} title={`${row.label}: ${row.count} bills`} />)}
        </div>
        <ul className="analytics-status-list">
          {billStatusTotals.map(row => <li key={row.label} className="analytics-status-row">
            <div className="analytics-status-row-head">
              <span><i style={{ background: row.color }} />{row.label === "Outstanding" ? "Outstanding (not overdue)" : row.label}</span>
              <strong>{row.count} {row.count === 1 ? "bill" : "bills"}</strong>
            </div>
            <div className="analytics-status-money">
              <span><small>Billed</small><strong>{money(row.billed)}</strong></span>
              <span><small>Collected</small><strong>{money(row.collected)}</strong></span>
              <span className="analytics-status-balance"><small>Balance</small><strong>{money(row.balance)}</strong></span>
            </div>
          </li>)}
        </ul>
        <div className="analytics-status-total">
          <span>Total · {billStatusTotal.count} bills</span>
          <strong>{money(billStatusTotal.balance)}</strong>
          <small>remaining balance of {money(billStatusTotal.billed)} billed</small>
        </div>
        <p className="analytics-footnote">Outstanding means unpaid bills that are not yet overdue; overdue is shown separately. Partially paid bills include both the amount collected and the remaining balance.</p>
      </section>

      <section className="analytics-panel analytics-room analytics-grid-wide" aria-labelledby="room-availability-heading">
        <SectionHeading id="room-availability-heading" icon={Building2} title="Room availability" subtitle="Current inventory · all buildings" />
        <div className="analytics-occupancy-visual">
          <div className="analytics-donut" style={{ background: roomCount ? "conic-gradient(" + donut + ")" : "#e2e8f0" }} role="img" aria-label={roomCount ? snapshot.inventory.map(item => item.count + " " + item.status + " rooms").join(", ") : "No rooms recorded"}>
            <div><strong>{snapshot.occupancy.toFixed(1)}%</strong><span>occupied</span></div>
          </div>
          <div>
            <p className="analytics-eyebrow">ROOM MIX</p>
            <p className="analytics-occupancy-caption">{snapshot.available} {snapshot.available === 1 ? "room" : "rooms"} available</p>
            <p className="analytics-muted">{snapshot.activeTenants} active tenants · {snapshot.inventory.find(item => item.status === "reserved")?.count || 0} reserved</p>
            <div className="analytics-vacancy-note"><span>Potential monthly rent from available rooms</span><strong>{money(snapshot.vacancyGap)}</strong></div>
          </div>
        </div>
        <div className="analytics-rows">{snapshot.inventory.map(item => <div key={item.status}><span className="capitalize"><i style={{ background: roomColors[item.status] }} />{item.status}</span><strong>{item.count} <small>rooms</small></strong><span className="analytics-percent">{roomCount ? (item.count / roomCount * 100).toFixed(1) : "0"}%</span></div>)}</div>
        <p className="analytics-footnote">Current room availability is independent of the selected report month. Reserved and maintenance rooms are excluded from the vacancy estimate.</p>
      </section>

      <section className="analytics-panel analytics-notes analytics-grid-narrow" aria-labelledby="notes-heading">
        <SectionHeading id="notes-heading" icon={Info} title="Notes & next actions" subtitle="How to read this report" />
        <details className="analytics-disclosure">
          <summary>Methodology and definitions</summary>
          <ul>
            <li>Collections use payment dates; bills use billing periods.</li>
            <li>Outstanding and overdue include saved bills through {snapshot.cutoff}.</li>
            <li>Occupancy reflects current rooms, independent of the selected {periodWord}.</li>
            <li>At risk means 2+ late or overdue bills in the last 6 months.</li>
          </ul>
        </details>
        <div className="analytics-actions">
          <button type="button" onClick={() => onNavigate?.("Billing")}><span><strong>Review outstanding bills</strong><small>{money(snapshot.outstanding)} unpaid · {snapshot.late?.length || 0} late</small></span><ArrowUpRight size={18} /></button>
          <button type="button" onClick={() => onNavigate?.("Rooms")}><span><strong>Review available rooms</strong><small>{snapshot.available} ready for assignment</small></span><ArrowUpRight size={18} /></button>
        </div>
      </section>
    </div>
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
          <div className="analytics-toolbar-right">
            <div className="analytics-controls">
              <label>Through <input type="month" aria-label="Report ending month" value={month} max={today().slice(0, 7)} onChange={event => { if (event.target.value) setMonth(event.target.value); }} /></label>
              <button type="button" className="analytics-refresh" disabled={loading} onClick={reload}>Refresh</button>
              <button type="button" disabled={!data||exporting} className="analytics-export disabled:opacity-50" onClick={() => setConfirmExport(true)}><Download size={16} />{exporting?'Preparing PDF...':'Export PDF'}</button>
            </div>
            {data && <p className="analytics-updated">Updated {new Date(data.loadedAt).toLocaleString("en-PH")}</p>}
          </div>
        </div>
        {loading&&!data ? <PageSkeleton variant="analytics" label="Loading analytics..."/> : error&&!data ? <p role="alert" className="text-rose-700">{error} <button onClick={reload} className="underline">Retry</button></p> : <><div aria-live="polite">{loading&&<p role="status" className="mb-3 text-sm text-blue-700">Updating analytics while keeping the current report visible…</p>}{error&&<p role="alert" className="mb-3 text-sm text-rose-700">{error} <button onClick={reload} className="underline">Retry</button></p>}{exporting&&<p role="status" className="mb-3 text-sm text-blue-700">Preparing your PDF download…</p>}</div><AnalyticsReport data={data} month={month} period={period} onNavigate={onNavigate} /></>}
      </div>
    </div>
    {confirmExport && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4">
      <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-pdf-title" aria-describedby="confirm-pdf-description" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="confirm-pdf-title" className="text-lg font-bold text-slate-900">Download analytics PDF?</h2>
        <p id="confirm-pdf-description" className="mt-2 text-sm leading-6 text-slate-600">A formatted A4 report for the {period.toLowerCase()} period ending {month} will be generated and downloaded to your device.</p>
        <div className="analytics-confirm-actions mt-6 flex justify-end gap-3"><button type="button" onClick={() => setConfirmExport(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button><button type="button" onClick={exportReport} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Download PDF</button></div>
      </section>
    </div>}
  </main>;
}
