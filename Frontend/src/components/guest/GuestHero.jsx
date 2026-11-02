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

      <div className="absolute inset-0 bg-gradient-to-r from-[#051c49]/95 via-[#0a428f]/82 to-[#146fd7]/45" />

      <div className="absolute inset-0 bg-gradient-to-t from-[#06265d]/60 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-[1240px] px-5 py-9 sm:px-8 sm:py-11 lg:py-14">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold tracking-[0.12em] backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-blue-300" />
            GUEST VIEW
          </div>

          <h2 className="text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
            Find your next{" "}
            <span className="text-blue-300">
              room.
            </span>
          </h2>

          <p className="mt-4 max-w-2xl text-base leading-7 text-blue-50/85 sm:text-lg">
            Browse our modern apartment units and find a comfortable
            space that fits your needs.
          </p>

          <div className="mt-6 grid max-w-3xl grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/[0.08] px-3 py-2.5 backdrop-blur-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <Home size={20} strokeWidth={1.8} />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  Modern Units
                </p>

                <p className="text-xs text-blue-100/85">
                  Clean & well-maintained
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/[0.08] px-3 py-2.5 backdrop-blur-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <ShieldCheck size={20} strokeWidth={1.8} />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  Secure & Safe
                </p>

                <p className="text-xs text-blue-100/85">
                  Your comfort matters
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/[0.08] px-3 py-2.5 backdrop-blur-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <UsersRound size={20} strokeWidth={1.8} />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  Great Community
                </p>

                <p className="text-xs text-blue-100/85">
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
