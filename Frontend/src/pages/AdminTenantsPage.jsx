import PageSkeleton from "../components/PageSkeleton.jsx";
import { useCallback, useState } from "react";
import PageControls from '../components/PageControls.jsx';
import { api } from "../lib/api.js";
import { useRemoteData } from "../lib/useRemoteData.js";
import AddTenantModal from "../components/admin/AddTenantModal.jsx";
import AdminHeader from "../components/admin/AdminHeader.jsx";
import AdminSidebar from "../components/admin/AdminSidebar.jsx";
import TenantCardGrid from "../components/admin/TenantCardGrid.jsx";
import TenantsToolbar from "../components/admin/TenantsToolbar.jsx";

const loadRooms=client=>client.get('/rooms');
function TenantModal({onAdd,onClose,tenants}) {
  const {data,error,loading,reload}=useRemoteData(loadRooms);
  return loading?<PageSkeleton variant="form" label="Loading available rooms..."/>:error?<p role="alert">{error} <button onClick={reload}>Retry</button><button onClick={onClose}>Cancel</button></p>:<AddTenantModal rooms={data} existingTenants={tenants} onAdd={onAdd} onClose={onClose}/>;
}
const loadWorkspace = async (client,offset) => {
  const page=await client.get('/tenants?limit=25&offset='+offset);
  return {
    ...page,tenants: page.data.map(tenant => ({
      ...tenant, name: tenant.full_name, room: tenant.rooms?.room_number || "Unassigned",
      roomId: tenant.room_id, rent: Number(tenant.monthly_rent), moveIn: tenant.move_in,
      leaseEnd: tenant.lease_end, emergencyName: tenant.emergency_name, emergencyPhone: tenant.emergency_phone,
    })),
  };
};

export default function AdminTenantsPage({ onNavigate, onLogout }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [offset,setOffset]=useState(0);
  const loader=useCallback(client=>loadWorkspace(client,offset),[offset]);
  const { data, loading, error, reload } = useRemoteData(loader);
  const addTenant = async account => {
    await api.post("/tenants", account);
    reload();
  };
  return <main className="flex min-h-screen bg-[#f1f5f9] text-slate-900">
    <AdminSidebar activePage="Tenants" onNavigate={onNavigate} />
    <div className="min-w-0 flex-1"><AdminHeader onLogout={onLogout} />
      <div className="mx-auto max-w-[1480px] px-6 pb-10 xl:px-10">
        <TenantsToolbar count={data?.total ?? null} onAdd={() => setIsAddOpen(true)} onRefresh={reload} loading={loading} />
        {loading ? <PageSkeleton variant="tenants" label="Loading tenants and billing balances..."/>
          : error ? <p role="alert" className="mb-4 text-rose-700">{error} <button onClick={reload} className="underline">Retry</button></p>
            : <><p className="mb-4 text-sm text-slate-500">Balances include all issued rent and utility bills.</p><TenantCardGrid addedTenants={data.tenants} onChanged={reload} /><PageControls offset={offset} limit={25} total={data.total} onChange={setOffset}/></>}
      </div>
    </div>
    {isAddOpen && <TenantModal tenants={data?.tenants || []} onAdd={addTenant} onClose={() => setIsAddOpen(false)} />}
  </main>;
}

