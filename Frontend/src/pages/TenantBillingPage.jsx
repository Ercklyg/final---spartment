import { useState } from "react";
import Chatbox from "../components/chatbox/Chatbox.jsx";
import BillingHero from "../components/tenant/BillingHero.jsx";
import StatementSection from "../components/tenant/StatementSection.jsx";
import TenantChatLauncher from "../components/tenant/TenantChatLauncher.jsx";
import TenantHeader from "../components/tenant/TenantHeader.jsx";
import UtilitySummaryCards from "../components/tenant/UtilitySummaryCards.jsx";
function TenantBillingPage({ onLogout, onNavigate }) { const [isChatOpen, setIsChatOpen] = useState(false); return <main className="min-h-screen bg-[#f6f9fd] text-slate-900"><TenantHeader activePage="billing" onLogout={onLogout} onNavigate={onNavigate} /><div className="mx-auto max-w-[1300px] px-5 pb-10 sm:px-8"><BillingHero /><div className="space-y-5"><UtilitySummaryCards /><StatementSection type="rent" /><StatementSection type="utility" /></div></div>{isChatOpen ? <Chatbox onClose={() => setIsChatOpen(false)} /> : <TenantChatLauncher onOpen={() => setIsChatOpen(true)} />}</main>; }
export default TenantBillingPage;
