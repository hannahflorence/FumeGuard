import type { AirStatus } from "@fumeguard/shared";

const styles: Record<AirStatus, string> = {
  safe: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  warning: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  hazardous: "bg-red-500/20 text-red-400 border-red-500/40",
};

const labels: Record<AirStatus, string> = {
  safe: "Safe",
  warning: "Warning",
  hazardous: "Hazardous",
};

export function StatusBadge({ status }: { status: AirStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold capitalize ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
