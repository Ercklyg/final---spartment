import { useState } from "react";
import { useTenantAccount } from "../lib/useTenantAccount.js";
import { useRemoteData } from "../lib/useRemoteData.js";
import { loadBills } from "../lib/billing.js";
import TenantAccountStatus from "../components/tenant/TenantAccountStatus.jsx";
import Chatbox from "../components/chatbox/Chatbox.jsx";
import SummaryCards from "../components/tenant/SummaryCards.jsx";
import TenantChatLauncher from "../components/tenant/TenantChatLauncher.jsx";
import TenantHeader from "../components/tenant/TenantHeader.jsx";
import WelcomeBanner from "../components/tenant/WelcomeBanner.jsx";
import NotificationTable from "../components/tenant/NotificationTable.jsx";
import CurrentBill from "../components/tenant/CurrentBill.jsx";
import MaintenanceRequestStatus from "../components/tenant/MaintenanceRequestStatus.jsx";
import PaymentHistory from "../components/tenant/PaymentHistory.jsx";

function DashboardContent({ account, onNavigate, onOpenChat, requestRevision }) {
  const { data: bills, error, loading, reload } = useRemoteData(loadBills);
  const nextBill = bills?.filter(bill => bill.balance > 0).sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  const currentBill = nextBill || bills?.toSorted((a, b) => b.billing_period.localeCompare(a.billing_period))[0];
  return <>
    <NotificationTable key={requestRevision} onNavigate={onNavigate} />
    <div className="mt-3 space-y-3">
      <SummaryCards account={account} />
      <CurrentBill bill={currentBill} loading={loading} error={error} onRetry={reload} onViewBilling={() => onNavigate?.("billing")} />
      <MaintenanceRequestStatus key={requestRevision} onOpenChat={onOpenChat} />
      <PaymentHistory bills={bills || []} loading={loading} error={error} onRetry={reload} onViewAll={() => onNavigate?.("billing")} />
    </div>
  </>;
}

export default function TenantDashboardPage({ onLogout, onNavigate }) {
  const { account, loading, error, retry } = useTenantAccount();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [requestRevision, setRequestRevision] = useState(0);
  return <main className="min-h-screen bg-[#f6f9fd] text-slate-900">
    <TenantHeader name={account?.full_name || "Tenant"} onLogout={onLogout} onNavigate={onNavigate} />
    <div className="mx-auto max-w-[920px] px-5 pb-10 sm:px-8">
      <WelcomeBanner name={account?.full_name} />
      <TenantAccountStatus loading={loading} error={error} retry={retry} variant="dashboard" />
      {account && <DashboardContent account={account} onNavigate={onNavigate} requestRevision={requestRevision} onOpenChat={() => setIsChatOpen(true)} />}
    </div>
    {isChatOpen ? <Chatbox key={account?.room?.id || "unassigned"} hideInquiry prefilledRoom={account?.room?.room_number || ""} onClose={() => { setIsChatOpen(false); setRequestRevision(n => n + 1); }} /> : <TenantChatLauncher onOpen={() => setIsChatOpen(true)} />}
  </main>;
}
