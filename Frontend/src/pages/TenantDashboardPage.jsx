import { useState } from "react";
import Chatbox from "../components/chatbox/Chatbox.jsx";
import CurrentBill from "../components/tenant/CurrentBill.jsx";
import MaintenanceRequestStatus from "../components/tenant/MaintenanceRequestStatus.jsx";
import NotificationTable from "../components/tenant/NotificationTable.jsx";
import PaymentHistory from "../components/tenant/PaymentHistory.jsx";
import SummaryCards from "../components/tenant/SummaryCards.jsx";
import TenantChatLauncher from "../components/tenant/TenantChatLauncher.jsx";
import TenantHeader from "../components/tenant/TenantHeader.jsx";
import WelcomeBanner from "../components/tenant/WelcomeBanner.jsx";

function TenantDashboardPage({ onLogout, onNavigate }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  return <main className="min-h-screen bg-[#f6f9fd] text-slate-900"><TenantHeader onLogout={onLogout} onNavigate={onNavigate} /><div className="mx-auto max-w-[920px] px-5 pb-10 sm:px-8"><WelcomeBanner /><NotificationTable /><div className="mt-3 space-y-3"><SummaryCards /><CurrentBill /><MaintenanceRequestStatus onOpenChat={() => setIsChatOpen(true)} /><PaymentHistory onViewAll={() => onNavigate?.("billing")} /></div></div>{isChatOpen ? <Chatbox hideInquiry prefilledRoom="201" onClose={() => setIsChatOpen(false)} /> : <TenantChatLauncher onOpen={() => setIsChatOpen(true)} />}</main>;
}
export default TenantDashboardPage;
