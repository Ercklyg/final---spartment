import LiveBilling from "../components/tenant/LiveBilling.jsx";
import { useTenantAccount } from "../lib/useTenantAccount.js";
import TenantAccountStatus from "../components/tenant/TenantAccountStatus.jsx";
import { useState } from "react";
import Chatbox from "../components/chatbox/Chatbox.jsx";
import BillingHero from "../components/tenant/BillingHero.jsx";


import TenantChatLauncher from "../components/tenant/TenantChatLauncher.jsx";
import TenantHeader from "../components/tenant/TenantHeader.jsx";


function TenantBillingPage({ onLogout, onNavigate }) { const {account,loading,error,retry}=useTenantAccount(); const [isChatOpen, setIsChatOpen] = useState(false); return <main className="min-h-screen bg-[#f6f9fd] text-slate-900"><TenantHeader name={account?.full_name || "Tenant"} activePage="billing" onLogout={onLogout} onNavigate={onNavigate} /><div className="mx-auto max-w-[1300px] px-5 pb-10 sm:px-8"><BillingHero /><TenantAccountStatus variant="tenant-billing" loading={loading} error={error} retry={retry}/><div className="space-y-5">{account && <LiveBilling/>}</div></div>{isChatOpen ? <Chatbox key={account?.room?.id || "unassigned"} hideInquiry prefilledRoom={account?.room?.room_number || ""} onClose={() => setIsChatOpen(false)} /> : <TenantChatLauncher onOpen={() => setIsChatOpen(true)} />}</main>; }
export default TenantBillingPage;
