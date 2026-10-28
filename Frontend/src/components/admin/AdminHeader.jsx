import { ChevronDown, LoaderCircle, LogOut } from "lucide-react";

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

  return <><header className="sticky top-0 z-40 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:h-[72px] sm:px-10"><span className="text-lg font-extrabold sm:text-xl lg:hidden">Spartment</span><div className="relative ml-auto"><button type="button" onClick={() => setIsMenuOpen((open) => !open)} aria-expanded={isMenuOpen} className="flex items-center gap-2 rounded-xl px-1 py-1 hover:bg-slate-50 sm:gap-3 sm:px-2"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white sm:h-11 sm:w-11 sm:text-base">A</span><span className="hidden text-left min-[360px]:block"><span className="block text-sm font-semibold sm:text-base">Admin</span><span className="block text-xs text-slate-500 sm:text-sm">Administrator</span></span><ChevronDown size={17} className="text-slate-500 sm:size-[18px]" /></button>{isMenuOpen && <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"><button type="button" onClick={requestLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"><LogOut size={17} />Logout</button></div>}</div></header>{isConfirmOpen && <div role="dialog" aria-modal="true" aria-labelledby="admin-logout-title" className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/35 px-5 backdrop-blur-sm"><div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600"><LogOut size={21} /></span><h2 id="admin-logout-title" className="mt-4 text-lg font-bold">Log out of Spartment?</h2><p className="mt-1.5 text-sm text-slate-500">Are you sure you want to log out of your admin account?</p><div className="mt-6 flex justify-end gap-3"><button type="button" disabled={isLoggingOut} onClick={() => setIsConfirmOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">No</button><button type="button" disabled={isLoggingOut} onClick={confirmLogout} className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-wait disabled:opacity-80">{isLoggingOut && <LoaderCircle size={16} className="animate-spin" />}{isLoggingOut ? "Logging out..." : "Yes, log out"}</button></div></div></div>}</>;
}

export default AdminHeader;
