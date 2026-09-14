import { useState } from "react";
import { MessagesSquare } from "lucide-react";

import GuestHeader from "../components/guest/GuestHeader.jsx";
import GuestHero from "../components/guest/GuestHero.jsx";
import RoomGrid from "../components/guest/RoomGrid.jsx";
import Chatbox from "../components/chatbox/Chatbox.jsx";

function GuestPage({ onExit }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatView, setChatView] = useState("menu");
  const [inquiryRoom, setInquiryRoom] = useState("");
  const handleExit = () => {
    if (typeof onExit === "function") {
      onExit();
      return;
    }
    window.history.back();
  };

  const handleInquire = (room) => {
    const roomLabel = room ? `${room.building || "Building"} / ${room.name || "Room"}` : "";
    setInquiryRoom(roomLabel);
    setChatView("inquiry");
    setIsChatOpen(true);
  };

  const handleOpenChat = () => {
    setChatView("menu");
    setIsChatOpen(true);
  };

  return (
    <main className="min-h-screen bg-[#f5f8fc] text-slate-950">
      <GuestHeader onExit={handleExit} />

      <GuestHero />

      <RoomGrid onInquire={handleInquire} />

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>
            © 2026 Spartment. All rights reserved.
          </p>

          <div className="flex items-center gap-5"><span>Ask management about privacy and tenancy policies.</span><button type="button" onClick={handleOpenChat} className="underline">Support</button></div>
        </div>
      </footer>

      {isChatOpen && (
        <Chatbox
          key={`${chatView}-${inquiryRoom}`}
          onClose={() => setIsChatOpen(false)}
          initialView={chatView}
          prefilledRoom={inquiryRoom}
        />
      )}

      {!isChatOpen && (
        <button
          type="button"
          onClick={handleOpenChat}
          aria-label="Open Spartment Assistant"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-[#0a2250] text-white shadow-[0_16px_40px_-10px_rgba(7,27,67,0.55),0_6px_16px_-6px_rgba(15,23,42,0.4)] ring-1 ring-inset ring-white/15 transition duration-200 hover:-translate-y-0.5 hover:bg-[#0e2c66] active:translate-y-0 active:scale-95 sm:bottom-6 sm:right-6"
        >
          <MessagesSquare size={24} strokeWidth={1.9} />

        </button>
      )}
    </main>
  );
}

export default GuestPage;
