import { useTenantAccount } from "../lib/useTenantAccount.js";
import TenantAccountStatus from "../components/tenant/TenantAccountStatus.jsx";
import { useState } from "react";
import Chatbox from "../components/chatbox/Chatbox.jsx";
import AccountInformation from "../components/tenant/AccountInformation.jsx";
import ChangePassword from "../components/tenant/ChangePassword.jsx";
import SettingsHero from "../components/tenant/SettingsHero.jsx";
import TenantChatLauncher from "../components/tenant/TenantChatLauncher.jsx";
import TenantHeader from "../components/tenant/TenantHeader.jsx";
function TenantSettingsPage({ onLogout, onNavigate }) { const {account,loading,error,retry}=useTenantAccount(); const [isChatOpen, setIsChatOpen] = useState(false); return <main className="min-h-screen bg-[#f6f9fd] text-slate-900"><TenantHeader name={account?.full_name || "Tenant"} activePage="settings" onLogout={onLogout} onNavigate={onNavigate} /><div className="mx-auto max-w-[1095px] px-5 pb-10 sm:px-8"><SettingsHero /><div className="space-y-5"><TenantAccountStatus loading={loading} error={error} retry={retry}/>{account && <AccountInformation account={account}/>}<ChangePassword /></div></div>{isChatOpen ? <Chatbox key={account?.room?.id || "unassigned"} hideInquiry prefilledRoom={account?.room?.room_number || ""} onClose={() => setIsChatOpen(false)} /> : <TenantChatLauncher onOpen={() => setIsChatOpen(true)} />}</main>; }
export default TenantSettingsPage;
