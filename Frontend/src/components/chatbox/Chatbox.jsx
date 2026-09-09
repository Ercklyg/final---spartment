import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import ChatboxHeader from "./ChatboxHeader";
import ChatboxMenu from "./ChatboxMenu";
import InquiryForm from "./InquiryForm";
import MaintenanceForm from "./MaintenanceForm";
import OtherForm from "./OtherForm";

function Chatbox({ onClose, initialView = "menu", prefilledRoom = "" }) {
  const [currentView, setCurrentView] = useState(initialView);

  useEffect(() => {
    setCurrentView(initialView);
  }, [initialView]);

  function handleSelect(type) {
    setCurrentView(type);
  }

  function handleBack() {
    setCurrentView("menu");
  }

  return (
    <div className="chatbox-enter fixed bottom-5 right-5 z-50 flex h-[620px] max-h-[calc(100dvh-48px)] w-[400px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-[22px] border border-slate-200/70 bg-white shadow-[0_24px_80px_-16px_rgba(7,27,67,0.35),0_8px_24px_-8px_rgba(15,23,42,0.15)] sm:bottom-6 sm:right-6">
      <ChatboxHeader onClose={onClose} />

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f7f9fc]">
        {currentView === "menu" && (
          <ChatboxMenu onSelect={handleSelect} />
        )}

        {currentView === "inquiry" && (
          <InquiryForm
            key={prefilledRoom}
            onBack={handleBack}
            prefilledRoom={prefilledRoom}
          />
        )}

        {currentView === "maintenance" && (
          <MaintenanceForm onBack={handleBack} />
        )}

        {currentView === "other" && (
          <OtherForm onBack={handleBack} />
        )}
      </div>

      <div className="flex shrink-0 items-center justify-center gap-1.5 border-t border-slate-100 bg-white px-4 py-2.5">
        <ShieldCheck size={13} className="text-slate-300" />
        <p className="text-[11px] font-medium tracking-wide text-slate-400">
          Secured by Spartment
        </p>
        <span className="h-0.5 w-0.5 rounded-full bg-slate-300" />
        <span className="flex items-center gap-1 text-[11px] text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Typically replies in minutes
        </span>
      </div>
    </div>
  );
}

export default Chatbox;
