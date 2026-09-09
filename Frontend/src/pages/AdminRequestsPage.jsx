import { useState } from "react";
import AdminHeader from "../components/admin/AdminHeader.jsx";
import AdminSidebar from "../components/admin/AdminSidebar.jsx";
import RequestList from "../components/admin/RequestList.jsx";
import RequestsToolbar from "../components/admin/RequestsToolbar.jsx";
function AdminRequestsPage({ onNavigate, onLogout }) { const [activeTab, setActiveTab] = useState("All"); return <main className="flex min-h-screen bg-[#f6f9fd] text-slate-900"><AdminSidebar activePage="Customer Requests" onNavigate={onNavigate} /><div className="min-w-0 flex-1"><AdminHeader onLogout={onLogout} /><div className="mx-auto max-w-[1280px] px-6 pb-10 xl:px-8"><RequestsToolbar activeTab={activeTab} onTabChange={setActiveTab} /><RequestList filter={activeTab} /></div></div></main>; }
export default AdminRequestsPage;
