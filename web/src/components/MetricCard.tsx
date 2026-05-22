interface MetricCardProps {
  label: string;
  value: string;
  unit: string;
  sub?: string;
}

export function MetricCard({ label, value, unit, sub }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-800/60 p-5 shadow-lg backdrop-blur">
      <p className="text-sm font-medium text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-white">
        {value}
        <span className="ml-1 text-lg font-normal text-slate-400">{unit}</span>
      </p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}
