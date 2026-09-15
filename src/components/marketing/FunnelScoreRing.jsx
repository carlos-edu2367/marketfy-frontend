export default function FunnelScoreRing({ score, label = 'controle / 100' }) {
  return (
    <div
      className="relative grid aspect-square w-40 shrink-0 place-items-center rounded-full sm:w-44"
      style={{ background: `conic-gradient(#FACC15 ${score}%, #F3F4F6 0)` }}
    >
      <div className="absolute inset-3 rounded-full bg-white" />
      <div className="relative text-center">
        <div className="text-4xl font-black tracking-tight text-gray-950">{score}</div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</div>
      </div>
    </div>
  );
}
