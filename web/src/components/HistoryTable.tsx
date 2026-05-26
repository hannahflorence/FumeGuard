import type { HistoryPoint } from "../hooks/useRealtimeData";
import { StatusBadge } from "./StatusBadge";

function formatTs(ts: number) {
  return new Date(ts).toLocaleString();
}

export function HistoryTable({ rows }: { rows: HistoryPoint[] }) {
  if (rows.length === 0) {
    return (
      <p className="p-6 text-center text-slate-400">No history for selected filters.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-700 text-slate-400">
            <th className="px-4 py-3 font-medium">Timestamp</th>
            <th className="px-4 py-3 font-medium">Gas (ppm)</th>
            <th className="px-4 py-3 font-medium">Dust (µg/m³)</th>
            <th className="px-4 py-3 font-medium">CEI</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Fan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-800/80 hover:bg-slate-800/40">
              <td className="px-4 py-2 text-slate-300">{formatTs(row.ts)}</td>
              <td className="px-4 py-2">{row.gasPpm.toFixed(1)}</td>
              <td className="px-4 py-2">{row.dustUgM3.toFixed(1)}</td>
              <td className="px-4 py-2">{row.cei.toFixed(1)}</td>
              <td className="px-4 py-2">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-4 py-2">{row.fanOn ? "On" : "Off"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
