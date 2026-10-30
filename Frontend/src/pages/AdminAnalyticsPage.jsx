import PageSkeleton from "../components/PageSkeleton.jsx";
import { showFeedback } from "../lib/actionFeedback.js";
import { api } from '../lib/api.js';
import { useCallback, useState } from "react";
import { useSessionState } from "../lib/useSessionState.js";
import { Activity, Building2, Download, TrendingUp, TriangleAlert, Wallet } from "lucide-react";
import AdminHeader from "../components/admin/AdminHeader.jsx";
import AdminSidebar from "../components/admin/AdminSidebar.jsx";
import { loadAdminAnalytics } from "../lib/adminAnalytics.js";
import { generateAnalyticsPdf } from "../lib/analyticsPdf.js";
import { money, today } from "../lib/billing.js";
import { useRemoteData } from "../lib/useRemoteData.js";
import "./AdminAnalyticsPage.css";

const agingColors = ["#fbbf24", "#fb923c", "#f87171", "#e11d48"];
const compactMoney = value => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", notation: "compact", maximumFractionDigits: 1 }).format(Number(value || 0));
const periodLabel = value => /^\d{4}-\d{2}$/.test(value)
  ? new Date(value + "-01T12:00:00").toLocaleDateString("en-PH", { month: "short", year: "2-digit" }) : value;
const buildingNames = room => (room || "Unassigned").split(", ").map(value => value === "Unassigned" ? value : value.split(" / ")[0]);


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

function AnalyticsReport({ data, month, period }) {
  const { snapshot, series, forecast, forecastMonths } = data;
  const collectionHealth = snapshot.collectionHealth || { aging: [], dueBillCount: 0, onTimeBillCount: 0, onTimeRate: 0, collectionRate: 0, repeatLatePayers: [] };
  const comparisonCeiling = Math.max(1, ...series.flatMap(point => [point.billed, point.value]));
  const forecastMax = Math.max(1, ...forecastMonths.map(point => Number(point.value || 0)));
  const [year, selectedMonth] = month.split("-").map(Number);
  const forecastLabel = new Date(year, selectedMonth, 1).toLocaleDateString("en-PH", { month: "long", year: "numeric" });
  const selectedMonthLabel = new Date(year, selectedMonth - 1, 1).toLocaleDateString("en-PH", { month: "long", year: "numeric" });
  const forecastStatus = data.forecastStatus || (month >= today().slice(0, 7) ? "month_incomplete" : forecast === null ? "missing_history" : "ready");
  const waitingForClose = forecastStatus === "month_incomplete";
  const forecastAvailableDate = new Date(year, selectedMonth, 1).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
  const overdueAging = collectionHealth.aging.filter(bucket => /^(31-60|61\+)/.test(bucket.label)).reduce((sum, bucket) => sum + Number(bucket.balance || 0), 0);
  const [riskPage, setRiskPage] = useState(1);
  const [riskBuilding, setRiskBuilding] = useState("All");
  const repeatLatePayers = collectionHealth.repeatLatePayers || [];
  const allRoomValues = repeatLatePayers.map(item => item.room);
  const buildingOptions = [...new Set(allRoomValues.flatMap(buildingNames))].sort((a, b) => a.localeCompare(b));
  const filteredRiskTenants = repeatLatePayers.filter(tenant => riskBuilding === "All" || buildingNames(tenant.room).includes(riskBuilding));
  const riskPageCount = Math.max(1, Math.ceil(filteredRiskTenants.length / TABLE_PAGE_SIZE));
  const currentRiskPage = Math.min(riskPage, riskPageCount);
  const visibleRiskTenants = filteredRiskTenants.slice((currentRiskPage - 1) * TABLE_PAGE_SIZE, currentRiskPage * TABLE_PAGE_SIZE);

  return <>
    <div className="analytics-report-grid">
      <div className="analytics-report-column">
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
        <p className="analytics-footnote">Bills use billing periods; collections use payment dates and may settle older bills. Zero means no saved payments for that period.</p>
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
      <section className="analytics-panel analytics-room analytics-grid-wide" aria-labelledby="room-availability-heading">
        <SectionHeading id="room-availability-heading" icon={Building2} title="Vacancy and potential revenue" subtitle="Current availability · independent of the selected report period" />
        <div className="analytics-vacancy-analysis">
          <div className="analytics-vacancy-chart">
            <div className="analytics-donut" style={{ background: `conic-gradient(#2563eb ${Math.max(0, Math.min(100, Number(snapshot.occupancy || 0)))}%, #e2e8f0 0)` }} role="img" aria-label={`${Number(snapshot.occupancy || 0).toFixed(1)} percent of rooms occupied`}>
              <div><strong>{Number(snapshot.occupancy || 0).toFixed(1)}%</strong><span>occupied</span></div>
            </div>
            <div className="analytics-vacancy-legend"><span><i />Occupied</span><span><i />Not occupied</span></div>
          </div>
          <div><p className="analytics-eyebrow">POTENTIAL MONTHLY RENT</p><strong className="analytics-vacancy-amount">{money(snapshot.vacancyGap)}</strong><p className="analytics-muted">Rental opportunity from {snapshot.available} available {snapshot.available === 1 ? "room" : "rooms"}</p></div>
        </div>
        <p className="analytics-footnote analytics-vacancy-explanation">Potential rent assumes available rooms are occupied for a full month. Reserved and maintenance rooms are excluded from this estimate.</p>
      </section>
      </div>
      <div className="analytics-report-column">
      <section className="analytics-panel analytics-forecast analytics-grid-narrow" aria-labelledby="forecast-heading">
        <SectionHeading id="forecast-heading" icon={TrendingUp} title="Collections forecast" subtitle={`Three-month moving average for ${forecastLabel}`} />
        <div className="analytics-forecast-value">
          <p className="analytics-eyebrow">ESTIMATED COLLECTIONS</p>
          <p className={"analytics-forecast-number" + (forecast === null ? " analytics-forecast-number--muted" : "")} aria-live="polite">{forecast === null ? waitingForClose ? `Waiting for ${selectedMonthLabel} to close` : "Not enough history" : money(forecast)}</p>
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
          ? waitingForClose
            ? `This forecast requires three completed months. Refresh on or after ${forecastAvailableDate}, once ${selectedMonthLabel} is complete. To view a forecast now, select an earlier completed month with payments in all three months shown.`
            : "At least one recorded payment is needed in each of the three completed months shown. Select another completed month or record any missing payments to calculate an estimate."
          : "Average recorded collections for the three completed months shown above."} Uses monthly history regardless of the chart grouping. This is an estimate, not guaranteed income.</p>
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
      </div>
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
        <header className="analytics-heading"><div><p className="analytics-eyebrow">PROPERTY PERFORMANCE</p><h1>Analytics &amp; Reports</h1><p className="analytics-muted">Revenue trends, collection health, payment risk, and vacancy analysis.</p></div></header>
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
