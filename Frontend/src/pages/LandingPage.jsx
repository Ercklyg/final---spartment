import { useState } from "react";
import { MessagesSquare } from "lucide-react";

import BrandPanel from "../components/landing/BrandPanel.jsx";
import LoginCard from "../components/landing/LoginCard.jsx";
import Chatbox from "../components/chatbox/Chatbox.jsx";

function LandingPage({ onContinueAsGuest, onSignIn, onAdminSignIn }) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <main className="h-screen w-full overflow-hidden bg-slate-50">
      <div className="flex h-full w-full flex-col lg:flex-row">
        <BrandPanel />

        <section className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-[#f6f9fd] px-5 py-6 sm:px-8 lg:w-[42%] lg:px-8 xl:px-10">
          <div className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-blue-100/50 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-40 -left-40 h-[420px] w-[420px] rounded-full bg-blue-100/30 blur-3xl" />

          <div className="relative z-10 flex w-full max-w-md items-center justify-center">
            <LoginCard onContinueAsGuest={onContinueAsGuest} onSignIn={onSignIn} onAdminSignIn={onAdminSignIn} />
          </div>
        </section>
      </div>

      {isChatOpen && (
        <Chatbox
          onClose={() => setIsChatOpen(false)}
        />
      )}

      {!isChatOpen && (
        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          aria-label="Open Spartment Assistant"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-[#0a2250] text-white shadow-[0_16px_40px_-10px_rgba(7,27,67,0.55),0_6px_16px_-6px_rgba(15,23,42,0.4)] ring-1 ring-inset ring-white/15 transition duration-200 hover:-translate-y-0.5 hover:bg-[#0e2c66] active:translate-y-0 active:scale-95 sm:bottom-6 sm:right-6"
        >
          <MessagesSquare size={24} strokeWidth={1.9} />
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold text-white">
            1
          </span>
        </button>
      )}
    </main>
  );
}

export default LandingPage;
