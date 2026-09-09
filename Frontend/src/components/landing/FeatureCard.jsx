function FeatureCard({ icon, title, description }) {
  return (
    <div className="flex min-h-[82px] items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-3 py-3 backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:bg-white/15">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-blue-100">
        {icon}
      </div>

      <div className="min-w-0">
        <h3 className="text-xs font-bold text-white sm:text-sm">
          {title}
        </h3>

        <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-blue-100/65 sm:text-xs">
          {description}
        </p>
      </div>
    </div>
  );
}

export default FeatureCard;