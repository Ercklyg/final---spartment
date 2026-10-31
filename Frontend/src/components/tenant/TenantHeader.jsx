
import { useEffect, useRef, useState } from "react";
import { Building2, ChevronDown, CreditCard, House, LoaderCircle, LogOut, Settings } from "lucide-react";

import "./TenantDesign.css";
import { closeFromBackdrop } from "../../lib/dialog.js";

const navigation = [{ label: "My Dashboard", page: "tenant", icon: House }, { label: "Billing", page: "billing", icon: CreditCard }, { label: "Settings", page: "settings", icon: Settings }];

function TenantHeader({ name = "Tenant", activePage = "tenant", onLogout, onNavigate }) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLogoutConfirmationOpen, setIsLogoutConfirmationOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const profile = useRef(null);
  useEffect(() => {
    if (!isProfileMenuOpen) return;
    const outside = event => { if (!profile.current?.contains(event.target)) setIsProfileMenuOpen(false); };
    const escape = event => { if (event.key === "Escape") setIsProfileMenuOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [isProfileMenuOpen]);
  const requestLogout = () => { setIsProfileMenuOpen(false); setIsLogoutConfirmationOpen(true); };
  const confirmLogout = () => { setIsLoggingOut(true); window.setTimeout(() => onLogout?.(), 600); };

  const initials = name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join("") || "T";
  const navigate = page => { setIsProfileMenuOpen(false); onNavigate?.(page); };
  const navItems = navigation.map(({ label, page, icon: Icon }) =>
    <button key={page} type="button" aria-current={activePage === page ? "page" : undefined}
      onClick={() => navigate(page)} className={"tenant-nav-item" + (activePage === page ? " is-active" : "")}>
      <Icon size={17} aria-hidden="true"/><span>{label}</span>
    </button>
  );

  return <><header className="tenant-header">
    <div className="tenant-header-inner">
      <button type="button" onClick={() => navigate("tenant")} aria-label="Spartment tenant dashboard" className="tenant-brand">
        <span className="tenant-brand-mark"><Building2 size={24} strokeWidth={1.8}/></span>
        <span className="tenant-brand-name">Spartment</span>
      </button>
      <nav className="tenant-desktop-nav" aria-label="Tenant navigation">{navItems}</nav>
      <div ref={profile} className="tenant-profile">
        <button type="button" onClick={() => setIsProfileMenuOpen(open => !open)}
          aria-label={`Account menu for ${name}`} aria-expanded={isProfileMenuOpen} aria-haspopup="menu"
          className={"tenant-profile-trigger" + (isProfileMenuOpen ? " is-open" : "")}>
          <span className="tenant-avatar">{initials}</span>
          <span className="tenant-profile-label"><span>{name}</span><small>Tenant</small></span>
          <ChevronDown size={16} aria-hidden="true" className={isProfileMenuOpen ? "rotate-180" : ""}/>
        </button>
        {isProfileMenuOpen && <div role="menu" aria-label="Account" className="tenant-profile-menu">
          <button type="button" role="menuitem" onClick={requestLogout}><LogOut size={17}/>Logout</button>
        </div>}
      </div>
    </div>
  </header>
    <nav className="tenant-mobile-nav" aria-label="Tenant mobile navigation">{navItems}</nav>
  {isLogoutConfirmationOpen && <div role="dialog" aria-modal="true" aria-labelledby="logout-title" onMouseDown={event=>closeFromBackdrop(event,()=>setIsLogoutConfirmationOpen(false),isLoggingOut)} className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/35 px-5 backdrop-blur-sm"><div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600"><LogOut size={21} /></div><h2 id="logout-title" className="mt-4 text-lg font-bold text-slate-900">Log out of Spartment?</h2><p className="mt-1.5 text-sm leading-6 text-slate-500">Are you sure you want to log out of your tenant account?</p><div className="mt-6 flex justify-end gap-3"><button type="button" disabled={isLoggingOut} onClick={() => setIsLogoutConfirmationOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">No</button><button type="button" disabled={isLoggingOut} onClick={confirmLogout} className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-wait disabled:opacity-80">{isLoggingOut && <LoaderCircle size={16} className="animate-spin" />}{isLoggingOut ? "Logging out..." : "Yes, log out"}</button></div></div></div>}</>;
}

export default TenantHeader;
