import {
  Home,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import apartmentBuilding from "../../assets/apartment-building.webp";

function GuestHero() {
  return (
    <section className="relative overflow-hidden bg-[#092c68] text-white">
      <img
        src={apartmentBuilding}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
      />

      <div className="absolute inset-0 bg-gradient-to-r from-[#06235a]/95 via-[#0b4ca3]/80 to-[#1877e8]/35" />

      <div className="absolute inset-0 bg-gradient-to-t from-[#06265d]/60 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-[1240px] px-5 py-12 sm:px-8 sm:py-14 lg:py-16">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold tracking-wide backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-blue-300" />
            GUEST VIEW
          </div>

          <h2 className="text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            Find your next{" "}
            <span className="text-blue-300">
              room.
            </span>
          </h2>

          <p className="mt-4 max-w-2xl text-base leading-7 text-blue-50/85 sm:text-lg">
            Browse our modern apartment units and find a comfortable
            space that fits your needs. All rooms start at{" "}
            <span className="font-semibold text-white">
              ₱6,500/month.
            </span>
          </p>

          <div className="mt-8 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <Home size={20} strokeWidth={1.8} />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  Modern Units
                </p>

                <p className="text-xs text-blue-100/65">
                  Clean & well-maintained
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <ShieldCheck size={20} strokeWidth={1.8} />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  Secure & Safe
                </p>

                <p className="text-xs text-blue-100/65">
                  Your comfort matters
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <UsersRound size={20} strokeWidth={1.8} />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  Great Community
                </p>

                <p className="text-xs text-blue-100/65">
                  More than a place to stay
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default GuestHero;
