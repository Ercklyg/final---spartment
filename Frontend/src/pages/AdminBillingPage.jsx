import "../components/admin/BillingReadability.css";
import { Bolt, ReceiptText } from "lucide-react";
import { useSessionState } from "../lib/useSessionState.js";
import AdminHeader from "../components/admin/AdminHeader.jsx";
import AdminSidebar from "../components/admin/AdminSidebar.jsx";
import LiveAdminBilling from "../components/admin/LiveAdminBilling.jsx";

function AdminBillingPage({ onNavigate, onLogout }) {
  const [tab, setTab] = useSessionState("admin-billing-tab", "rent");
  const isRentBilling = tab === "rent";

  return <main className="admin-billing flex min-h-screen bg-[#f6f9fd] text-slate-900">
    <AdminSidebar activePage="Billing" onNavigate={onNavigate} />
    <div className="min-w-0 flex-1">
      <AdminHeader onLogout={onLogout} />
      <div className="mx-auto max-w-[1280px] px-4 pb-24 sm:px-6 lg:pb-10 xl:px-8">
        <section className="pt-6 sm:pt-7"><h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{isRentBilling ? "Billing" : "Utility Billing"}</h1><p className="mt-1 text-base leading-6 text-slate-500 sm:text-lg">{isRentBilling ? "Record received payments against saved rent bills." : "Create electricity and water bills, then record payments when received."}</p></section>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
          <button type="button" onClick={() => setTab("rent")} className={`flex min-w-0 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium sm:px-4 ${isRentBilling ? "border-blue-200 bg-blue-50 text-blue-600" : "border-slate-200 bg-white text-slate-500"}`}><ReceiptText size={18} className="shrink-0" /><span>Rent Billing</span></button>
          <button type="button" onClick={() => setTab("utility")} className={`flex min-w-0 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium sm:px-4 ${!isRentBilling ? "border-blue-200 bg-blue-50 text-blue-600" : "border-slate-200 bg-white text-slate-500"}`}><Bolt size={18} className="shrink-0" /><span>Utility Billing</span></button>
        </div>
        <LiveAdminBilling key={tab} type={tab}/>
      </div>
    </div>
  </main>;
}

export default AdminBillingPage;
