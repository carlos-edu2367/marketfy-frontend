export default function FunnelProgressBar({ current, total, label }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="sticky top-0 z-10 -mx-5 border-b-2 border-brand-ink bg-brand-yellow px-5 py-3 sm:-mx-8 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="h-3 overflow-hidden rounded-full border-2 border-brand-ink bg-white">
          <div
            className="h-full bg-brand-ink transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs font-black uppercase tracking-wider text-brand-ink">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      </div>
    </div>
  );
}
