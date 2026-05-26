const PAGE_SIZE = 5;

export { PAGE_SIZE };

export function Pagination({
  page,
  totalItems,
  onPageChange,
}: {
  page: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = totalItems === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const end = Math.min(safePage * PAGE_SIZE, totalItems);

  return (
    <div className="flex items-center justify-between border-t border-slate-700/80 px-4 py-3 text-sm">
      <span className="text-slate-500">
        {totalItems === 0
          ? "No entries"
          : `${start}–${end} of ${totalItems}`}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="rounded-lg border border-slate-600 px-3 py-1 text-slate-300 hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <span className="min-w-[5rem] text-center text-slate-400">
          {safePage} / {totalPages}
        </span>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="rounded-lg border border-slate-600 px-3 py-1 text-slate-300 hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function paginateSlice<T>(items: T[], page: number): T[] {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  return items.slice(start, start + PAGE_SIZE);
}
