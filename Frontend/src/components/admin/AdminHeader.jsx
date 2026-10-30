import { ChevronDown, LoaderCircle, LogOut, ShieldCheck } from "lucide-react";

import { useState } from "react";

function AdminHeader({ onLogout }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const requestLogout = () => { setIsMenuOpen(false); setIsConfirmOpen(true); };
  const confirmLogout = () => {
    setIsLoggingOut(true);
    window.setTimeout(() => onLogout?.(), 600);
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center px-4 sm:h-[72px] sm:px-6 xl:px-8">
          <span className="text-lg font-extrabold tracking-tight sm:text-xl lg:hidden">Spartment</span>
          <div className="relative ml-auto">
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
              className={"group flex items-center gap-2 rounded-xl border py-1.5 pl-1.5 pr-2 text-left transition sm:gap-3 " + (isMenuOpen ? "border-slate-200 bg-slate-50 shadow-sm" : "border-transparent hover:border-slate-200 hover:bg-slate-50")}
            >
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-sm ring-2 ring-white sm:h-10 sm:w-10 sm:text-base">
                A
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
              </span>
              <span className="hidden min-w-0 text-left min-[360px]:block">
                <span className="block text-sm font-semibold leading-tight text-slate-900 sm:text-[15px]">Admin</span>
                <span className="block text-xs leading-tight text-slate-500 sm:text-[13px]">Administrator</span>
              </span>
              <ChevronDown
                size={17}
                className={"shrink-0 text-slate-400 transition-transform duration-200 " + (isMenuOpen ? "rotate-180 text-slate-600" : "group-hover:text-slate-600")}
              />
            </button>
            {isMenuOpen && (
              <div role="menu" className="admin-menu-enter absolute right-0 top-[calc(100%+10px)] z-50 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">A</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-900">Admin</span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <ShieldCheck size={12} className="text-blue-600" />Administrator
                    </span>
                  </span>
                </div>
                <div className="p-1.5">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={requestLogout}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                  >
                    <LogOut size={16} />Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
      {isConfirmOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="admin-logout-title" className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/35 px-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200/70 bg-white p-6 shadow-2xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600"><LogOut size={21} /></span>
            <h2 id="admin-logout-title" className="mt-4 text-lg font-bold">Log out of Spartment?</h2>
            <p className="mt-1.5 text-sm text-slate-500">Are you sure you want to log out of your admin account?</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={isLoggingOut} onClick={() => setIsConfirmOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">No</button>
              <button type="button" disabled={isLoggingOut} onClick={confirmLogout} className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-wait disabled:opacity-80">
                {isLoggingOut && <LoaderCircle size={16} className="animate-spin" />}
                {isLoggingOut ? "Logging out..." : "Yes, log out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminHeader;
