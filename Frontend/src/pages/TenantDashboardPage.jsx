import { useState } from "react";
import { useTenantAccount } from "../lib/useTenantAccount.js";
import { useRemoteData } from "../lib/useRemoteData.js";
import { loadBills } from "../lib/billing.js";
import TenantAccountStatus from "../components/tenant/TenantAccountStatus.jsx";
import Chatbox from "../components/chatbox/Chatbox.jsx";
import SummaryCards from "../components/tenant/SummaryCards.jsx";
import TenantChatLauncher from "../components/tenant/TenantChatLauncher.jsx";
import WelcomeBanner from "../components/tenant/WelcomeBanner.jsx";
import NotificationTable from "../components/tenant/NotificationTable.jsx";
import CurrentBill from "../components/tenant/CurrentBill.jsx";
import MaintenanceRequestStatus from "../components/tenant/MaintenanceRequestStatus.jsx";
import PaymentHistory from "../components/tenant/PaymentHistory.jsx";
import { AlertTriangle, ArrowRight } from "lucide-react";

function DashboardContent({ account, onNavigate, onOpenChat, requestRevision }) {
  const { data: bills, error, loading, reload } = useRemoteData(loadBills);
  const nextBill = bills?.filter(bill => bill.balance > 0).sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  const currentBill = nextBill || bills?.toSorted((a, b) => b.billing_period.localeCompare(a.billing_period))[0];
  return <>
    {nextBill&&<div role="status" className={`mt-4 flex flex-col gap-3 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center ${nextBill.displayStatus==='Late'?'border-rose-200 bg-gradient-to-r from-rose-50 to-white':'border-amber-200 bg-gradient-to-r from-amber-50 to-white'}`}><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${nextBill.displayStatus==='Late'?'bg-rose-100 text-rose-700':'bg-amber-100 text-amber-700'}`}><AlertTriangle size={21}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className={nextBill.displayStatus==='Late'?'text-rose-900':'text-amber-900'}>{nextBill.displayStatus==='Late'?'Payment overdue':'Payment reminder'}</strong><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${nextBill.displayStatus==='Late'?'bg-rose-100 text-rose-700':'bg-amber-100 text-amber-700'}`}>{nextBill.bill_type}</span></div><p className="mt-1 text-sm text-slate-600"><span className="font-semibold text-slate-900">{new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(nextBill.balance)}</span> balance · Due {new Date(nextBill.due_date+'T00:00:00').toLocaleDateString('en-PH',{dateStyle:'medium'})}</p></div><button type="button" onClick={()=>onNavigate?.('billing')} className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-sm ${nextBill.displayStatus==='Late'?'bg-rose-600 hover:bg-rose-700':'bg-amber-600 hover:bg-amber-700'}`}>View billing <ArrowRight size={16}/></button></div>}
    <NotificationTable key={requestRevision} onNavigate={onNavigate} />
    <div className="mt-4 space-y-4">
      <SummaryCards account={account} />
      <CurrentBill bill={currentBill} hasData={bills !== null} loading={loading} error={error} onRetry={reload} onViewBilling={() => onNavigate?.("billing")} />
      <MaintenanceRequestStatus key={requestRevision} onOpenChat={onOpenChat} />
      <PaymentHistory bills={bills || []} hasData={bills !== null} loading={loading} error={error} onRetry={reload} onViewAll={() => onNavigate?.("billing")} />
    </div>
  </>;
}

export default function TenantDashboardPage({ onNavigate }) {
  const { account, loading, error, retry } = useTenantAccount();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [requestRevision, setRequestRevision] = useState(0);
  return <div>
    <div className="tenant-content">
      <WelcomeBanner name={account?.full_name} />
      <TenantAccountStatus loading={loading} error={error} retry={retry} variant="dashboard" />
      {account && <DashboardContent account={account} onNavigate={onNavigate} requestRevision={requestRevision} onOpenChat={() => setIsChatOpen(true)} />}
    </div>
    {isChatOpen ? <Chatbox key={account?.room?.id || "unassigned"} hideInquiry prefilledRoom={account?.room?.room_number || ""} onClose={() => { setIsChatOpen(false); setRequestRevision(n => n + 1); }} /> : <TenantChatLauncher onOpen={() => setIsChatOpen(true)} />}
  </div>;
}
