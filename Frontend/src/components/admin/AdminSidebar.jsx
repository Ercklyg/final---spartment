import { Building2, ChartNoAxesCombined, CreditCard, LayoutDashboard, MessageSquare, UsersRound } from "lucide-react";

const items = [
  ["Dashboard", "Home", LayoutDashboard],
  ["Rooms", "Units", Building2],
  ["Tenants", "People", UsersRound],
  ["Billing", "Bills", CreditCard],
  ["Customer Requests", "Inbox", MessageSquare],
  ["Analytics & Reports", "Reports", ChartNoAxesCombined],
];

function AdminSidebar({ activePage = "Dashboard", onNavigate }) {
  return <aside className="fixed inset-x-0 bottom-0 z-50 flex h-[68px] border-t border-slate-200 bg-white px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_rgba(15,23,42,0.06)] lg:sticky lg:top-0 lg:h-screen lg:w-[274px] lg:shrink-0 lg:flex-col lg:border-r lg:border-t-0 lg:p-5 lg:shadow-none">
    <div className="hidden lg:flex lg:items-center lg:gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm"><Building2 size={26}/></span><div><h1 className="text-2xl font-extrabold tracking-tight">Spartment</h1><p className="text-sm text-slate-500">Apartment OS</p></div></div>
    <p className="hidden lg:mt-12 lg:block lg:px-3 lg:text-sm lg:text-slate-500">Manage</p>
    <nav className="grid flex-1 grid-cols-6 items-stretch lg:mt-2 lg:block lg:space-y-1" aria-label="Admin navigation">
      {items.map(([label, mobileLabel, Icon]) => <button key={label} type="button" aria-label={label} title={label} onClick={() => onNavigate?.(label)} className={"flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-[9px] font-medium text-slate-600 transition hover:bg-slate-50 lg:h-auto lg:w-full lg:flex-row lg:justify-start lg:gap-4 lg:px-4 lg:py-3.5 lg:text-left lg:text-base " + (activePage === label ? "bg-blue-600 text-white shadow-sm" : "lg:text-slate-800")}>
        <Icon size={19}/><span className="max-w-full truncate lg:hidden">{mobileLabel}</span><span className="hidden lg:inline">{label}</span>
      </button>)}
    </nav>
  </aside>;
}

export default AdminSidebar;
