import { ClipboardList, MessagesSquare } from "lucide-react";

function TenantChatLauncher({ onOpen, onOpenRules }) {
  return (
    <>
    {onOpenRules && <button type="button" onClick={onOpenRules} aria-label="Rules & Regulations" aria-haspopup="dialog" title="Rules & Regulations" className="tenant-rules-launcher fixed right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-600 shadow-lg transition hover:bg-blue-50 active:scale-95 sm:right-6 lg:hidden"><ClipboardList size={23} aria-hidden="true"/></button>}
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open Spartment Assistant"
      className="tenant-chat-launcher fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-[#0a2250] text-white shadow-[0_16px_40px_-10px_rgba(7,27,67,0.55),0_6px_16px_-6px_rgba(15,23,42,0.4)] ring-1 ring-inset ring-white/15 transition duration-200 hover:-translate-y-0.5 hover:bg-[#0e2c66] active:translate-y-0 active:scale-95 sm:bottom-6 sm:right-6"
    >
      <MessagesSquare size={24} strokeWidth={1.9} />
    </button>
    </>
  );
}

export default TenantChatLauncher;
