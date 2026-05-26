import type { StoredEvent } from "@fumeguard/shared";
import { Pagination, paginateSlice } from "./Pagination";

function formatTs(ts: number) {
  return new Date(ts).toLocaleString();
}

export function EventsList({
  events,
  page,
  onPageChange,
}: {
  events: (StoredEvent & { id: string })[];
  page: number;
  onPageChange: (page: number) => void;
}) {
  const pageEvents = paginateSlice(events, page);

  return (
    <>
      <ul className="min-h-[12rem] divide-y divide-slate-800/80 text-sm">
        {events.length === 0 && (
          <li className="px-4 py-6 text-center text-slate-500">No events yet</li>
        )}
        {pageEvents.map((e) => (
          <li key={e.id} className="px-4 py-3 text-slate-300">
            <div className="text-xs text-slate-500">{formatTs(e.ts)}</div>
            <div className="mt-0.5">
              <span className="font-medium text-sky-400">{e.type}</span>
              {e.message ? `: ${e.message}` : null}
            </div>
          </li>
        ))}
      </ul>
      <Pagination page={page} totalItems={events.length} onPageChange={onPageChange} />
    </>
  );
}
