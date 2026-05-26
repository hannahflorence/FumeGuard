import { useEffect, useMemo, useState } from "react";
import { EventsList } from "../components/EventsList";
import { HistoryTable } from "../components/HistoryTable";
import { MetricCard } from "../components/MetricCard";
import { Pagination, paginateSlice } from "../components/Pagination";
import { SessionSummary } from "../components/SessionSummary";
import { StatusBadge } from "../components/StatusBadge";
import { SystemStatus } from "../components/SystemStatus";
import { TrendCharts } from "../components/TrendCharts";
import {
  useEvents,
  useFilteredHistory,
  useHistory,
  useLatest,
  useSessions,
} from "../hooks/useRealtimeData";
import { DEVICE_ID } from "../lib/firebase";

export function Dashboard() {
  const { data: latest, loading, error } = useLatest();
  const { data: history, loading: historyLoading } = useHistory(80);
  const { data: sessions, loading: sessionsLoading } = useSessions();
  const { data: events } = useEvents(100);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [eventsPage, setEventsPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
  const toTs = dateTo ? new Date(dateTo).getTime() + 86400000 - 1 : null;
  const filteredHistory = useFilteredHistory(history, fromTs, toTs);

  const historyNewestFirst = useMemo(
    () => [...filteredHistory].sort((a, b) => b.ts - a.ts),
    [filteredHistory]
  );

  const historyPageRows = paginateSlice(historyNewestFirst, historyPage);

  useEffect(() => {
    setHistoryPage(1);
  }, [dateFrom, dateTo, history.length]);

  useEffect(() => {
    setEventsPage(1);
  }, [events.length]);

  const activeSession = useMemo(
    () => sessions.find((s) => s.endedAt === null),
    [sessions]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <section className="grid gap-4 lg:grid-cols-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between lg:col-span-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">FumeGuard</h1>
            <p className="mt-1 text-slate-400">
              Solder fume monitoring · Device{" "}
              <code className="text-sky-400">{DEVICE_ID}</code>
            </p>
          </div>
          {latest && <StatusBadge status={latest.status} />}
        </header>

        <div className="rounded-xl border border-slate-700/80 bg-slate-800/40 p-4 lg:col-start-4 lg:row-start-1">
          <h3 className="mb-3 text-lg font-semibold text-white">System actuators</h3>
          <SystemStatus latest={latest} />
        </div>

        <MetricCard
          label="Gas (MQ-135)"
          value={latest ? latest.gasPpm.toFixed(1) : "—"}
          unit="ppm"
        />
        <MetricCard
          label="Particulates"
          value={latest ? latest.dustUgM3.toFixed(1) : "—"}
          unit="µg/m³"
        />
        <MetricCard
          label="Cumulative Exposure"
          value={latest ? latest.cei.toFixed(1) : "—"}
          unit="CEI"
          sub={activeSession ? "Active session" : "Idle / no session"}
        />
        <MetricCard
          label="Exposure load"
          value={latest?.load != null ? (latest.load * 100).toFixed(0) : "—"}
          unit="%"
          sub="Of hazard threshold"
        />
      </section>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300">
          Cannot reach Firebase: {error}. Start emulators and the backend bridge.
        </div>
      )}

      {loading && !latest && (
        <p className="text-slate-400">Connecting to live data…</p>
      )}

      <section>
        {!historyLoading && <TrendCharts history={history} />}
      </section>

      <SessionSummary sessions={sessions} loading={sessionsLoading} />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col rounded-xl border border-slate-700/80 bg-slate-800/40">
          <h3 className="border-b border-slate-700/80 px-4 py-3 text-lg font-semibold text-white">
            Recent events
          </h3>
          <EventsList
            events={events}
            page={eventsPage}
            onPageChange={setEventsPage}
          />
        </div>

        <div className="flex flex-col rounded-xl border border-slate-700/80 bg-slate-800/40">
          <div className="flex flex-col gap-3 border-b border-slate-700/80 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
            <h3 className="text-lg font-semibold text-white">Historical readings</h3>
            <div className="flex flex-wrap gap-3">
              <label className="text-sm text-slate-400">
                From
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="ml-2 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-white"
                />
              </label>
              <label className="text-sm text-slate-400">
                To
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="ml-2 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-white"
                />
              </label>
            </div>
          </div>
          <HistoryTable rows={historyPageRows} />
          <Pagination
            page={historyPage}
            totalItems={historyNewestFirst.length}
            onPageChange={setHistoryPage}
          />
        </div>
      </section>
    </div>
  );
}
