import { useState } from 'react';
import { Building2, CreditCard, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react';

const navigation = [
  { label: 'Dashboard', page: 'tenant', icon: LayoutDashboard },
  { label: 'Billing', page: 'billing', icon: CreditCard },
  { label: 'Settings', page: 'settings', icon: Settings },
];

export default function TenantSidebar({ activePage = 'tenant', onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);
  const width = collapsed ? 88 : 260;
  return <>
    <div className="hidden shrink-0 transition-[width] duration-200 lg:block" style={{ width, minWidth: width, flexBasis: width }}>
      <aside className="fixed inset-y-0 left-0 z-30 flex h-dvh flex-col border-r-2 border-slate-200 bg-white p-4 shadow-[6px_0_18px_rgba(15,23,42,0.035)] transition-[width] duration-200" style={{ width }} aria-label="Tenant sidebar">
        <button type="button" onClick={() => onNavigate?.('tenant')} aria-label="Spartment tenant dashboard" className={`flex items-center rounded-2xl ${collapsed ? 'justify-center' : 'gap-3 border border-slate-100 bg-gradient-to-r from-white to-blue-50/70 p-2'}`}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-200/60"><Building2 size={24} aria-hidden="true"/></span>
          {!collapsed && <span className="min-w-0 text-left"><span className="block text-[22px] font-black leading-none tracking-tight text-slate-950">Spartment</span><span className="mt-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Tenant portal</span></span>}
        </button>
        <div className="my-5 h-px bg-slate-200"/>
        <nav aria-label="Tenant navigation" className="-mx-2 min-h-0 flex-1 space-y-1 overflow-y-auto px-2">
          {!collapsed && <p className="mb-2 px-3 text-xs font-bold uppercase tracking-widest text-slate-500">My account</p>}
          {navigation.map(({ label, page, icon: Icon }) => {
            const active = page === activePage;
            return <button key={page} type="button" aria-label={label} aria-current={active ? 'page' : undefined} title={collapsed ? label : undefined} onClick={() => onNavigate?.(page)} className={`group relative flex w-full items-center rounded-xl py-2.5 text-left text-sm font-semibold transition-all ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:translate-x-0.5 hover:bg-white hover:text-slate-900'}`}>
              {active && <span aria-hidden="true" className="tenant-active-indicator absolute -left-2 h-7 w-1 rounded-full bg-blue-600"/>}
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${active ? 'bg-blue-600 text-white shadow-sm shadow-blue-200' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'}`}><Icon size={18} aria-hidden="true"/></span>
              {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
            </button>;
          })}
        </nav>
        <div className="mt-4 border-t border-slate-200 pt-4"><button type="button" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} className="flex min-h-11 w-full items-center rounded-xl px-3 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900">{collapsed ? <PanelLeftOpen size={19} aria-hidden="true"/> : <PanelLeftClose size={19} aria-hidden="true"/>}</button></div>
      </aside>
    </div>
    <nav className="tenant-mobile-nav" aria-label="Tenant mobile navigation">{navigation.map(({ label, page, icon: Icon }) => <button key={page} type="button" aria-label={label} aria-current={activePage === page ? 'page' : undefined} onClick={() => onNavigate?.(page)} className={'tenant-nav-item' + (activePage === page ? ' is-active' : '')}><Icon size={20} aria-hidden="true"/><span>{label}</span></button>)}</nav>
  </>;
}
