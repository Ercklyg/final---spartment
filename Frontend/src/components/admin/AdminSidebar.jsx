import { useState } from "react";
import { Building2, ChartNoAxesCombined, CreditCard, LayoutDashboard, MessageSquare, PanelLeftClose, PanelLeftOpen, UsersRound } from "lucide-react";

const groups = [
  { label: "Property", items: [["Dashboard", "Home", LayoutDashboard], ["Rooms", "Units", Building2], ["Tenants", "People", UsersRound]] },
  { label: "Operations", items: [["Billing", "Bills", CreditCard], ["Customer Requests", "Inbox", MessageSquare]] },
  { label: "Insights", items: [["Analytics & Reports", "Reports", ChartNoAxesCombined]] },
];
const items = groups.flatMap(group => group.items);

function DesktopItem({ label, Icon, active, collapsed, onNavigate }) {
  return <button type="button" aria-label={label} title={collapsed ? label : undefined} onClick={() => onNavigate?.(label)} className={`group relative flex w-full items-center rounded-xl py-2.5 text-left text-sm font-semibold transition-all ${collapsed ? "justify-center px-2" : "gap-3 px-3"} ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:translate-x-0.5 hover:bg-white hover:text-slate-900"}`}>
    {active && <span className="absolute -left-2 h-7 w-1 rounded-full bg-blue-600" />}
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${active ? "bg-blue-600 text-white shadow-sm shadow-blue-200" : "bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600"}`}><Icon size={18}/></span>
    {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
  </button>;
}

function AdminSidebar({ activePage = "Dashboard", onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? 88 : 260;
  return <>
    <div className="hidden shrink-0 transition-[width] duration-200 lg:block" style={{ width: sidebarWidth, minWidth: sidebarWidth, flexBasis: sidebarWidth }}>
    <aside className="fixed bottom-0 left-0 top-0 z-30 flex h-screen flex-col border-r-2 border-slate-200 bg-white p-4 shadow-[6px_0_18px_rgba(15,23,42,0.035)] transition-[width] duration-200" style={{ width: sidebarWidth }}>
      <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3 rounded-2xl border border-slate-100 bg-gradient-to-r from-white to-blue-50/70 p-2"}`}>
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 text-white shadow-[0_8px_18px_rgba(37,99,235,0.28)] ring-1 ring-blue-400/30">
          <span aria-hidden="true" className="absolute inset-x-2 top-2 h-px bg-white/30" />
          <span aria-hidden="true" className="absolute -bottom-3 -right-3 h-8 w-8 rounded-full bg-white/10" />
          <Building2 size={24} strokeWidth={2.15}/>
        </span>
        {!collapsed && <div className="min-w-0"><h1 className="truncate text-[22px] font-black leading-none tracking-[-0.035em] text-slate-950">Spartment</h1><p className="mt-1.5 flex items-center gap-1.5 truncate text-[10px] font-semibold uppercase tracking-[0.11em] text-slate-500"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-blue-500"/>Property Management</p></div>}
      </div>
      <div className="my-5 h-px bg-slate-200" />
      <nav className="admin-sidebar-nav min-h-0 flex-1 overflow-y-auto" aria-label="Admin navigation">{groups.map((group, groupIndex) => <div key={group.label} className={groupIndex ? "admin-sidebar-group mt-5" : ""}>{!collapsed && <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{group.label}</p>}<div className="space-y-1">{group.items.map(([label, , Icon]) => <DesktopItem key={label} label={label} Icon={Icon} active={activePage === label} collapsed={collapsed} onNavigate={onNavigate} />)}</div></div>)}</nav>
      <div className="mt-4 border-t border-slate-200 pt-4"><button type="button" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="flex w-full items-center justify-start rounded-xl px-3 py-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900">{collapsed ? <PanelLeftOpen size={19}/> : <PanelLeftClose size={19}/>}</button></div>
    </aside>
    </div>
    <aside className="fixed inset-x-0 bottom-0 z-50 flex h-[68px] border-t border-slate-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_rgba(15,23,42,0.06)] backdrop-blur-md lg:hidden"><nav className="grid flex-1 grid-cols-6" aria-label="Admin mobile navigation">{items.map(([label, mobileLabel, Icon]) => { const active = activePage === label; return <button key={label} type="button" aria-label={label} title={label} onClick={() => onNavigate?.(label)} className={`relative flex min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-[9px] font-semibold transition-colors ${active ? "text-blue-700" : "text-slate-500 hover:bg-slate-50"}`}>{active && <span className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-blue-600" />}<span className={`flex h-8 w-8 items-center justify-center rounded-lg ${active ? "bg-blue-50 text-blue-700" : ""}`}><Icon size={18}/></span><span className="max-w-full truncate">{mobileLabel}</span></button>; })}</nav></aside>
  </>;
}

export default AdminSidebar;
