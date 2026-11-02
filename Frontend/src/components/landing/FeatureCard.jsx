function FeatureCard({ icon, title, description }) {
  return (
    <div className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:bg-white/15 motion-reduce:transform-none motion-reduce:transition-none">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-blue-100">
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
