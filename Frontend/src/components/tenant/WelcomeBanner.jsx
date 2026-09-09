function WelcomeBanner() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-transparent via-blue-50/60 to-slate-100 px-1 py-5 sm:px-0 sm:py-6">
      <div className="relative z-10">
        <p className="text-sm text-slate-500">Good to see you again,</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.045em] text-slate-900 sm:text-[34px]">Hello, Maria <span aria-hidden="true">👋</span></h1>
        <p className="mt-1 text-sm text-slate-500">Here&apos;s a snapshot of your apartment.</p>
      </div>
      <div className="pointer-events-none absolute right-[17%] top-0 hidden h-28 w-28 rounded-full bg-blue-100/80 md:block" />
      <p className="pointer-events-none absolute right-[25%] top-8 hidden -rotate-6 font-serif text-lg italic leading-6 text-blue-700 md:block">A better<br />place to live<br />every day!</p>
      <div className="pointer-events-none absolute -right-10 -top-16 hidden h-48 w-64 rounded-bl-[90px] bg-gradient-to-br from-slate-100 via-white to-slate-300 opacity-80 md:block" />
    </section>
  );
}

export default WelcomeBanner;
