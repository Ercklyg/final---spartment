import AdminHeader from "../components/admin/AdminHeader.jsx";
import AdminHero from "../components/admin/AdminHero.jsx";
import AdminMetrics from "../components/admin/AdminMetrics.jsx";
import AdminNotifications from "../components/admin/AdminNotifications.jsx";
import AdminSidebar from "../components/admin/AdminSidebar.jsx";
import SmartRecommendations from "../components/admin/SmartRecommendations.jsx";
function AdminDashboardPage({ onNavigate, onLogout }) { return <main className="flex min-h-screen bg-[#f6f9fd] text-slate-900"><AdminSidebar onNavigate={onNavigate} /><div className="min-w-0 flex-1"><AdminHeader onLogout={onLogout} /><div className="mx-auto max-w-[1280px] px-6 pb-10 xl:px-10"><AdminHero /><div className="grid gap-5 xl:grid-cols-2"><AdminNotifications /><AdminMetrics /></div><div className="mt-5"><SmartRecommendations /></div></div></div></main>; }
export default AdminDashboardPage;
