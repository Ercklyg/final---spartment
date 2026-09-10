import { tenantMocks } from "../components/admin/tenantMocks.js";
import { useState } from "react";
import AddTenantModal from "../components/admin/AddTenantModal.jsx";
import AdminHeader from "../components/admin/AdminHeader.jsx";
import AdminSidebar from "../components/admin/AdminSidebar.jsx";
import TenantCardGrid from "../components/admin/TenantCardGrid.jsx";
import TenantsToolbar from "../components/admin/TenantsToolbar.jsx";
function AdminTenantsPage({onNavigate,onLogout}){const [isAddOpen,setIsAddOpen]=useState(false);const [addedTenants,setAddedTenants]=useState([]);return <main className="flex min-h-screen bg-[#f1f5f9] text-slate-900"><AdminSidebar activePage="Tenants" onNavigate={onNavigate}/><div className="min-w-0 flex-1"><AdminHeader onLogout={onLogout}/><div className="mx-auto max-w-[1480px] px-6 pb-10 xl:px-10"><TenantsToolbar count={tenantMocks.length+addedTenants.length} onAdd={()=>setIsAddOpen(true)}/><TenantCardGrid addedTenants={addedTenants}/></div></div>{isAddOpen&&<AddTenantModal existingTenants={[...tenantMocks.map(t=>({email:t[1],room:t[3]})),...addedTenants]} onAdd={tenant=>setAddedTenants(old=>[...old,tenant])} onClose={()=>setIsAddOpen(false)}/>}</main>;}
export default AdminTenantsPage;
