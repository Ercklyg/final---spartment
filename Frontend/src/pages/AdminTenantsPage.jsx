import AdminHeader from "../components/admin/AdminHeader.jsx";
import AdminSidebar from "../components/admin/AdminSidebar.jsx";
import TenantCardGrid from "../components/admin/TenantCardGrid.jsx";
import TenantsToolbar from "../components/admin/TenantsToolbar.jsx";
function AdminTenantsPage({ onNavigate, onLogout }) { return <main className="flex min-h-screen bg-[#f1f5f9] text-slate-900"><AdminSidebar activePage="Tenants" onNavigate={onNavigate} /><div className="min-w-0 flex-1"><AdminHeader onLogout={onLogout} /><div className="mx-auto max-w-[1480px] px-6 pb-10 xl:px-10"><TenantsToolbar /><TenantCardGrid /></div></div></main>; }
export default AdminTenantsPage;
