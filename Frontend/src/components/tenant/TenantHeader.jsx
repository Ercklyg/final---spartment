import { useState } from "react";
import { Building2, ChevronDown, CreditCard, House, LogOut, Settings } from "lucide-react";

const navigation = [
  { label: "My Dashboard", page: "tenant", icon: House },
  { label: "Billing", page: "billing", icon: CreditCard },
  { label: "Settings", page: "settings", icon: Settings },
];

function TenantHeader({ activePage = "tenant", onLogout, onNavigate }) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLogoutConfirmationOpen, setIsLogoutConfirmationOpen] = useState(false);

  const requestLogout = () => {
    setIsProfileMenuOpen(false);
    setIsLogoutConfirmationOpen(true);
  };

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-5 px-5 sm:px-8">
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm"><Building2 size={18} /></span>
          <span className="text-base font-extrabold tracking-tight text-slate-900">Spartment</span>
        </div>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Tenant navigation">
          {navigation.map(({ label, page, icon: Icon }) => (
            <button key={label} type="button" onClick={() => page && onNavigate?.(page)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${activePage === page ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <div className="relative">
          <button type="button" onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)} aria-expanded={isProfileMenuOpen} aria-haspopup="menu" className="flex items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-slate-50">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">M</span>
            <span className="hidden sm:block"><span className="block text-xs font-semibold text-slate-800">Maria Santos</span><span className="block text-[10px] text-slate-500">Tenant</span></span>
            <ChevronDown size={15} className="hidden text-slate-400 sm:block" />
          </button>
          {isProfileMenuOpen && <div role="menu" className="absolute right-0 top-[calc(100%+10px)] w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"><button type="button" role="menuitem" onClick={requestLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"><LogOut size={16} />Logout</button></div>}
          </div>
        </div>
      </div>
    </header>
    {isLogoutConfirmationOpen && <div role="dialog" aria-modal="true" aria-labelledby="logout-title" className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/35 px-5 backdrop-blur-sm"><div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600"><LogOut size={21} /></div><h2 id="logout-title" className="mt-4 text-lg font-bold text-slate-900">Log out of Spartment?</h2><p className="mt-1.5 text-sm leading-6 text-slate-500">Are you sure you want to log out of your tenant account?</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setIsLogoutConfirmationOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">No</button><button type="button" onClick={onLogout} className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">Yes, log out</button></div></div></div>}
    </>
  );
}

export default TenantHeader;
