import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SessionRecord } from "@fumeguard/shared";

export function SessionSummary({
  sessions,
  loading,
}: {
  sessions: SessionRecord[];
  loading: boolean;
}) {
  const recent = sessions.slice(0, 8).reverse();
  const chartData = recent.map((s) => ({
    name: new Date(s.startedAt).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    cei: Math.round(s.finalCei * 10) / 10,
    peakGas: s.peakGasPpm,
  }));

  if (loading) {
    return <div className="text-slate-400">Loading sessions…</div>;
  }

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700/80 bg-slate-800/40 p-6 text-slate-400">
        No completed sessions yet. Start soldering to record exposure.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-800/40 p-4">
      <h3 className="mb-4 text-lg font-semibold text-white">Session exposure (CEI)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: "#1e293b",
              border: "1px solid #475569",
              borderRadius: 8,
            }}
          />
          <Bar dataKey="cei" name="Final CEI" fill="#f97316" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
