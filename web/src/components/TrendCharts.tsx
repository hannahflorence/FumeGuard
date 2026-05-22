import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistoryPoint } from "../hooks/useRealtimeData";

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function TrendCharts({ history }: { history: HistoryPoint[] }) {
  const chartData = history.map((h) => ({
    time: formatTime(h.ts),
    gas: h.gasPpm,
    dust: h.dustUgM3,
    cei: h.cei,
  }));

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700/80 bg-slate-800/40 p-8 text-center text-slate-400">
        Waiting for sensor history…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-800/40 p-4">
      <h3 className="mb-4 text-lg font-semibold text-white">Real-time trends</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 11 }} />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: "#1e293b",
              border: "1px solid #475569",
              borderRadius: 8,
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="gas" name="Gas (ppm)" stroke="#38bdf8" dot={false} />
          <Line type="monotone" dataKey="dust" name="Dust (µg/m³)" stroke="#a78bfa" dot={false} />
          <Line type="monotone" dataKey="cei" name="CEI" stroke="#f97316" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
