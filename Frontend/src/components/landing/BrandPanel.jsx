import {
  BarChart3,
  Building2,
  FileText,
  Wrench,
} from "lucide-react";

import apartmentBuilding from "../../assets/apartment-building.jpg";
import FeatureCard from "./FeatureCard.jsx";

function BrandPanel() {
  return (
    <section className="relative h-screen w-full overflow-hidden bg-[#071b43] text-white lg:w-[58%]">
      <img
        src={apartmentBuilding}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[65%_center]"
      />

      <div className="absolute inset-0 bg-[#071b43]/45" />

      <div className="absolute inset-0 bg-gradient-to-r from-[#06183c]/90 via-[#0b2d6b]/65 to-[#1268c9]/20" />

      <div className="relative z-10 flex h-full flex-col px-7 py-6 sm:px-10 sm:py-7 xl:px-12">
        <header className="flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-md">
              <Building2
                size={24}
                strokeWidth={1.8}
              />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Spartment
              </h1>

              <p className="text-[11px] text-blue-100/70">
                Manage Today. Build Tomorrow.
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-7 text-sm md:flex">
            <a
              href="#features"
              className="border-b border-white pb-1 text-white"
            >
              Features
            </a>

            <a
              href="#about"
              className="text-blue-100/75 transition hover:text-white"
            >
              About
            </a>

            <a
              href="#contact"
              className="text-blue-100/75 transition hover:text-white"
            >
              Contact
            </a>
          </nav>
        </header>

        <div className="flex min-h-0 flex-1 flex-col justify-center">
          <div className="max-w-2xl">
            <h2 className="text-[clamp(3rem,4.7vw,5rem)] font-extrabold leading-[0.94] tracking-[-0.045em]">
              Simpler
              <br />
              Management.
              <br />
              <span className="text-blue-400">
                Happier Living.
              </span>
            </h2>

            <p className="mt-5 max-w-xl text-sm leading-6 text-blue-50/80 sm:text-base sm:leading-7">
              Spartment helps property owners and tenants stay connected —
              from room management and billing to maintenance requests and
              real-time updates, all in one secure platform.
            </p>

            <div
              id="features"
              className="mt-6 grid max-w-2xl grid-cols-2 gap-3"
            >
              <FeatureCard
                icon={
                  <Building2
                    size={22}
                    strokeWidth={1.8}
                  />
                }
                title="Room Management"
                description="Keep every unit and resident organized."
              />

              <FeatureCard
                icon={
                  <FileText
                    size={22}
                    strokeWidth={1.8}
                  />
                }
                title="Billing & Payments"
                description="Track payments and monthly bills with ease."
              />

              <FeatureCard
                icon={
                  <Wrench
                    size={22}
                    strokeWidth={1.8}
                  />
                }
                title="Maintenance Requests"
                description="Submit and monitor requests in real time."
              />

              <FeatureCard
                icon={
                  <BarChart3
                    size={22}
                    strokeWidth={1.8}
                  />
                }
                title="Reports & Insights"
                description="See building performance at a glance."
              />
            </div>

            <div className="mt-6 flex items-center gap-3">
              <div className="h-px w-12 bg-white/50" />

              <p className="text-xs font-medium text-blue-100/70 sm:text-sm">
                A Smarter Way to Manage Apartments
              </p>
            </div>

            <div className="mt-4 hidden items-start gap-3 sm:flex">
              <span className="text-4xl leading-none text-blue-400">
                “
              </span>

              <p className="max-w-sm text-sm italic leading-6 text-blue-100/70">
                Organized spaces create better communities.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default BrandPanel;