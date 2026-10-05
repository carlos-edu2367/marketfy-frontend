export default function FunnelProgressBar({ current, total, label }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="sticky top-0 z-10 -mx-5 bg-white/90 px-5 py-3 backdrop-blur-md sm:-mx-8 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-brand-yellow transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs font-medium text-gray-400">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      </div>
    </div>
  );
}
