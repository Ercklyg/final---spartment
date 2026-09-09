import { Building2, LogOut } from "lucide-react";

function GuestHeader({ onExit }) {
  return (
    <header className="sticky top-0 z-40 h-[72px] border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-[1240px] items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <Building2 size={21} strokeWidth={1.8} />
          </div>

          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-950">
              Spartment
            </h1>

            <p className="hidden text-[10px] font-medium text-slate-400 sm:block">
              Manage Today. Build Tomorrow.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onExit}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <LogOut size={17} strokeWidth={1.8} />
          <span>Exit</span>
        </button>
      </div>
    </header>
  );
}

export default GuestHeader;