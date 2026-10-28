import PageSkeleton from "../components/PageSkeleton.jsx";
import { useCallback, useState } from "react";
import PageControls from '../components/PageControls.jsx';
import { api } from "../lib/api.js";
import { useRemoteData } from "../lib/useRemoteData.js";
import { useSessionState } from "../lib/useSessionState.js";
import AddTenantModal from "../components/admin/AddTenantModal.jsx";
import AdminHeader from "../components/admin/AdminHeader.jsx";
import AdminSidebar from "../components/admin/AdminSidebar.jsx";
import TenantCardGrid from "../components/admin/TenantCardGrid.jsx";
import TenantsToolbar from "../components/admin/TenantsToolbar.jsx";

const loadRooms=client=>client.get('/rooms',{cacheMs:30_000});
function TenantModal({onAdd,onClose,tenants}) {
  const {data,error,loading,reload}=useRemoteData(loadRooms);
  if (loading || error) return <div role="dialog" aria-modal="true" aria-labelledby="tenant-modal-loading-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4">
    <section className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div><h2 id="tenant-modal-loading-title" className="text-xl font-bold">Add tenant</h2><p className="mt-1 text-sm text-slate-500">Preparing the available-room options.</p></div>
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50">Cancel</button>
      </div>
      {loading ? <PageSkeleton variant="form" label="Loading available rooms..."/> : <div className="mt-6"><p role="alert" className="text-sm text-rose-700">{error}</p><button type="button" onClick={reload} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Retry</button></div>}
    </section>
  </div>;
  return <AddTenantModal rooms={data} existingTenants={tenants} onAdd={onAdd} onClose={onClose}/>;
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
  const [offset,setOffset]=useSessionState("admin-tenants-offset",0);
  const loader=useCallback(client=>loadWorkspace(client,offset),[offset]);
  const { data, loading, error, reload } = useRemoteData(loader,{keepPrevious:true});
  const addTenant = async account => {
    await api.post("/tenants", account);
    reload();
  };
  return <main className="flex min-h-screen bg-[#f1f5f9] text-slate-900">
    <AdminSidebar activePage="Tenants" onNavigate={onNavigate} />
    <div className="min-w-0 flex-1"><AdminHeader onLogout={onLogout} />
      <div className="mx-auto max-w-[1480px] px-6 pb-10 xl:px-10">
        <TenantsToolbar count={data?.total ?? null} onAdd={() => setIsAddOpen(true)} onRefresh={reload} loading={loading} />
        {loading&&!data ? <PageSkeleton variant="tenants" label="Loading tenants and billing balances..."/>
          : error&&!data ? <p role="alert" className="mb-4 text-rose-700">{error} <button onClick={reload} className="underline">Retry</button></p>
            : <><div aria-live="polite">{loading&&<p role="status" className="mb-3 text-sm text-blue-700">Updating tenant records…</p>}{error&&<p role="alert" className="mb-3 text-sm text-rose-700">{error} <button onClick={reload} className="underline">Retry</button></p>}</div><p className="mb-4 text-sm text-slate-500">Balances include all issued rent and utility bills.</p><TenantCardGrid addedTenants={data.tenants} onChanged={reload} /><PageControls disabled={loading} offset={offset} limit={25} total={data.total} onChange={setOffset}/></>}
      </div>
    </div>
    {isAddOpen && <TenantModal tenants={data?.tenants || []} onAdd={addTenant} onClose={() => setIsAddOpen(false)} />}
  </main>;
}

