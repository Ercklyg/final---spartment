import "../components/admin/BillingReadability.css";
import { useState } from "react";
import { Bolt, ReceiptText } from "lucide-react";
import AdminHeader from "../components/admin/AdminHeader.jsx";
import AdminSidebar from "../components/admin/AdminSidebar.jsx";

import RentBillingTable from "../components/admin/RentBillingTable.jsx";
import UtilityBillingContent from "../components/admin/UtilityLedger.jsx";

function AdminBillingPage({ onNavigate, onLogout }) {
  const [tab, setTab] = useState("rent");
  const isRentBilling = tab === "rent";

  return <main className="admin-billing flex min-h-screen bg-[#f6f9fd] text-slate-900"><AdminSidebar activePage="Billing" onNavigate={onNavigate} /><div className="min-w-0 flex-1"><AdminHeader onLogout={onLogout} /><div className="mx-auto max-w-[1280px] px-6 pb-10 xl:px-8"><section className="pt-7"><h1 className="text-4xl font-extrabold tracking-tight">{isRentBilling ? "Billing" : "Utility Billing"}</h1><p className="mt-1 text-lg text-slate-500">{isRentBilling ? "Payments are hand-to-hand · admin updates the status" : "Manage electricity and water bills for each tenant. Update amounts and save to record payments."}</p></section><div className="mt-4"><div className="flex gap-2"><button type="button" onClick={() => setTab("rent")} className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium ${isRentBilling ? "border-blue-200 bg-blue-50 text-blue-600" : "border-slate-200 bg-white text-slate-500"}`}><ReceiptText size={18} />Rent Billing</button><button type="button" onClick={() => setTab("utility")} className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium ${!isRentBilling ? "border-blue-200 bg-blue-50 text-blue-600" : "border-slate-200 bg-white text-slate-500"}`}><Bolt size={18} />Utility Billing</button></div></div>{isRentBilling ? <RentBillingTable /> : <UtilityBillingContent />}</div></div></main>;
}

export default AdminBillingPage;
