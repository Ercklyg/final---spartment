import AdminHeader from "../components/admin/AdminHeader.jsx";
import AdminSidebar from "../components/admin/AdminSidebar.jsx";
import LiveAdminDashboard from "../components/admin/LiveAdminDashboard.jsx";
export default function AdminDashboardPage({onNavigate,onLogout}) {
  return <main className="flex min-h-screen bg-[#f6f9fd] text-slate-900"><AdminSidebar onNavigate={onNavigate}/><div className="min-w-0 flex-1"><AdminHeader onLogout={onLogout}/><div className="mx-auto max-w-[1280px] px-4 pb-24 sm:px-6 lg:pb-10 xl:px-8"><LiveAdminDashboard onNavigate={onNavigate}/></div></div></main>;
}
