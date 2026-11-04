import { useTenantAccount } from "../lib/useTenantAccount.js";
import TenantAccountStatus from "../components/tenant/TenantAccountStatus.jsx";
import { useState } from "react";
import Chatbox from "../components/chatbox/Chatbox.jsx";
import AccountInformation from "../components/tenant/AccountInformation.jsx";
import ChangePassword from "../components/tenant/ChangePassword.jsx";
import NotificationPreferences from "../components/tenant/NotificationPreferences.jsx";
import SettingsHero from "../components/tenant/SettingsHero.jsx";
import TenantChatLauncher from "../components/tenant/TenantChatLauncher.jsx";
function TenantSettingsPage() { const {account,loading,error,retry}=useTenantAccount(); const [isChatOpen, setIsChatOpen] = useState(false); return <div><div className="mx-auto max-w-[1095px] px-5 pb-10 sm:px-8"><SettingsHero /><div className="space-y-5"><TenantAccountStatus loading={loading} error={error} retry={retry}/>{account && <AccountInformation account={account}/>}<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6"><NotificationPreferences/></section><ChangePassword /></div></div>{isChatOpen ? <Chatbox key={account?.room?.id || "unassigned"} hideInquiry prefilledRoom={account?.room?.room_number || ""} onClose={() => setIsChatOpen(false)} /> : <TenantChatLauncher onOpen={() => setIsChatOpen(true)} />}</div>; }
export default TenantSettingsPage;
