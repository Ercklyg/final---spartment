import { Building2, X } from "lucide-react";

function ChatboxHeader({ onClose }) {
  return (
    <div className="relative shrink-0 overflow-hidden bg-[#0a2250] px-4 pb-4 pt-4 text-white">
      <div className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-blue-500/25 blur-2xl" />
      <div className="pointer-events-none absolute -left-8 -bottom-16 h-32 w-32 rounded-full bg-sky-400/15 blur-2xl" />

      <div className="relative flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-sm">
            <Building2 size={20} strokeWidth={1.8} className="text-white" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0a2250] bg-emerald-400" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold leading-tight tracking-tight">
            Spartment Assistant
          </h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-blue-100/75">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Online now
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-blue-100/80 transition hover:bg-white/10 hover:text-white"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

export default ChatboxHeader;
