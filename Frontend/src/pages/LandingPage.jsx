import { useState } from "react";
import { MessagesSquare } from "lucide-react";

import BrandPanel from "../components/landing/BrandPanel.jsx";
import LoginCard from "../components/landing/LoginCard.jsx";
import Chatbox from "../components/chatbox/Chatbox.jsx";
import BuildingViewer from "../components/guest/BuildingViewer.jsx";

function LandingPage({ onContinueAsGuest, onSignIn }) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-slate-50">
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        <BrandPanel />

        <section id="sign-in" className="relative flex w-full items-center justify-center overflow-hidden bg-[#f6f9fd] px-5 py-10 sm:px-8 sm:py-12 lg:h-screen lg:w-[42%] lg:px-8 lg:py-6 xl:px-10">
          <div className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-blue-100/50 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-40 -left-40 h-[420px] w-[420px] rounded-full bg-blue-100/30 blur-3xl" />

          <div className="relative z-10 flex w-full max-w-md items-center justify-center">
            <LoginCard onContinueAsGuest={onContinueAsGuest} onSignIn={onSignIn} />
          </div>
        </section>
      </div>

      <section id="about" className="border-t border-slate-200 bg-white pb-14 sm:pb-16">
        <div className="mx-auto max-w-[1240px] px-5 pt-10 sm:px-8 sm:pt-12">
          <div className="mb-6 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Explore before you visit</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Explore our buildings.</h2>
            <p className="mt-2 text-sm text-slate-500">Take a closer look in 3D. Rotate a building or expand it for a larger view.</p>
          </div>
          <div className="building-gallery grid grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <BuildingViewer compact />
            <BuildingViewer compact building="building2" />
            <BuildingViewer compact building="building3" />
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-[1080px] px-5 sm:px-8">
          <p className="text-center text-xs font-bold uppercase tracking-[0.24em] text-blue-600">How it works</p>
          <h2 className="mt-2 text-center text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Apartment management, made simple.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[['1', 'Sign in securely', 'Access the right dashboard for your role.'], ['2', 'Stay up to date', 'Check bills, rooms, and requests in one place.'], ['3', 'Take action', 'Manage payments and maintenance without the back-and-forth.']].map(([number, title, description]) => <article key={number} className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{number}</span><h3 className="mt-4 font-bold text-slate-900">{title}</h3><p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p></article>)}
          </div>
        </div>
      </section>

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
