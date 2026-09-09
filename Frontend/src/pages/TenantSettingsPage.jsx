import { useState } from "react";
import Chatbox from "../components/chatbox/Chatbox.jsx";
import AccountInformation from "../components/tenant/AccountInformation.jsx";
import ChangePassword from "../components/tenant/ChangePassword.jsx";
import SettingsHero from "../components/tenant/SettingsHero.jsx";
import TenantChatLauncher from "../components/tenant/TenantChatLauncher.jsx";
import TenantHeader from "../components/tenant/TenantHeader.jsx";
function TenantSettingsPage({ onLogout, onNavigate }) { const [isChatOpen, setIsChatOpen] = useState(false); return <main className="min-h-screen bg-[#f6f9fd] text-slate-900"><TenantHeader activePage="settings" onLogout={onLogout} onNavigate={onNavigate} /><div className="mx-auto max-w-[1095px] px-5 pb-10 sm:px-8"><SettingsHero /><div className="space-y-5"><AccountInformation /><ChangePassword /></div></div>{isChatOpen ? <Chatbox onClose={() => setIsChatOpen(false)} /> : <TenantChatLauncher onOpen={() => setIsChatOpen(true)} />}</main>; }
export default TenantSettingsPage;
