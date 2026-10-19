import Link from "next/link";
import { formatMonth, previousMonth } from "@/lib/metrics";

function nextMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
}

export function MonthSwitcher({ month, basePath }: { month: string; basePath: string }) {
  return (
    <div className="flex items-center gap-3">
      <Link className="btn-quiet" href={`${basePath}?month=${previousMonth(month)}`} aria-label="Previous month">
        ←
      </Link>
      <span className="min-w-36 text-center font-semibold">{formatMonth(month)}</span>
      <Link className="btn-quiet" href={`${basePath}?month=${nextMonth(month)}`} aria-label="Next month">
        →
      </Link>
    </div>
  );
}
