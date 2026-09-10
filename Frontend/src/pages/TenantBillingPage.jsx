import { useState } from "react";
import Chatbox from "../components/chatbox/Chatbox.jsx";
import BillingHero from "../components/tenant/BillingHero.jsx";
import BillingBalanceSummary from "../components/tenant/BillingBalanceSummary.jsx";
import StatementSection from "../components/tenant/StatementSection.jsx";
import TenantChatLauncher from "../components/tenant/TenantChatLauncher.jsx";
import TenantHeader from "../components/tenant/TenantHeader.jsx";

import UtilitySummaryCards from "../components/tenant/UtilitySummaryCards.jsx";
function TenantBillingPage({ onLogout, onNavigate }) { const [isChatOpen, setIsChatOpen] = useState(false); const [statusFilter, setStatusFilter] = useState("All"); return <main className="min-h-screen bg-[#f6f9fd] text-slate-900"><TenantHeader activePage="billing" onLogout={onLogout} onNavigate={onNavigate} /><div className="mx-auto max-w-[1300px] px-5 pb-10 sm:px-8"><BillingHero /><div className="space-y-5"><BillingBalanceSummary /><div className="flex flex-wrap gap-2">{["All", "Paid", "Pending", "Late"].map((status) => <button key={status} type="button" onClick={() => setStatusFilter(status)} className={"rounded-lg px-3 py-2 text-sm font-medium " + (statusFilter === status ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>{status}</button>)}</div><UtilitySummaryCards /><StatementSection type="rent" statusFilter={statusFilter} /><StatementSection type="utility" statusFilter={statusFilter} /></div></div>{isChatOpen ? <Chatbox hideInquiry prefilledRoom="201" onClose={() => setIsChatOpen(false)} /> : <TenantChatLauncher onOpen={() => setIsChatOpen(true)} />}</main>; }
export default TenantBillingPage;
