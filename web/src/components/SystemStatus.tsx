import type { LatestReading } from "@fumeguard/shared";

export function SystemStatus({ latest }: { latest: LatestReading | null }) {
  if (!latest) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Actuator label="Exhaust fan" on={false} unknown />
        <Actuator label="Alert LED" on={false} unknown />
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Actuator label="Exhaust fan" on={latest.fanOn} />
      <Actuator label="Alert LED" on={latest.ledOn} />
    </div>
  );
}

function Actuator({
  label,
  on,
  unknown,
}: {
  label: string;
  on: boolean;
  unknown?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-700/80 bg-slate-800/50 px-4 py-3">
      <span className="text-sm text-slate-300">{label}</span>
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          unknown
            ? "bg-slate-700 text-slate-400"
            : on
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-slate-700 text-slate-400"
        }`}
      >
        {unknown ? "—" : on ? "ON" : "OFF"}
      </span>
    </div>
  );
}
