// The four numbers in every monthly review. Pure functions, so they are easy to test.

export type LeadForMetrics = {
  source: string;
  stage: "new" | "contacted" | "qualified" | "won" | "lost";
  valueCents: number | null;
  isRepeat: boolean;
  firstContactOn: string; // YYYY-MM-DD
  closedOn: string | null;
};

export type MonthMetrics = {
  month: string;
  enquiries: number;
  enquiriesBySource: Record<string, number>;
  spendDollars: number | null;
  costPerEnquiryDollars: number | null;
  salesCount: number;
  salesDollars: number;
  repeatSharePercent: number | null;
};

export function inMonth(isoDate: string | null, month: string): boolean {
  return !!isoDate && isoDate.slice(0, 7) === month;
}

export function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return d.toISOString().slice(0, 7);
}

// First day of the month and first day of the next, for date range queries.
export function monthRange(month: string): [string, string] {
  const [y, m] = month.split("-").map(Number);
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  return [`${month}-01`, next];
}

export function isMonth(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeMonth(
  leads: LeadForMetrics[],
  month: string,
  spendCents: number | null,
): MonthMetrics {
  const enquiries = leads.filter((l) => inMonth(l.firstContactOn, month));
  const sales = leads.filter((l) => l.stage === "won" && inMonth(l.closedOn, month));

  const enquiriesBySource: Record<string, number> = {};
  for (const l of enquiries) enquiriesBySource[l.source] = (enquiriesBySource[l.source] ?? 0) + 1;

  const salesCents = sales.reduce((sum, l) => sum + (l.valueCents ?? 0), 0);
  const repeat = sales.filter((l) => l.isRepeat).length;

  return {
    month,
    enquiries: enquiries.length,
    enquiriesBySource,
    spendDollars: spendCents === null ? null : round2(spendCents / 100),
    costPerEnquiryDollars:
      spendCents === null || enquiries.length === 0
        ? null
        : round2(spendCents / 100 / enquiries.length),
    salesCount: sales.length,
    salesDollars: round2(salesCents / 100),
    repeatSharePercent: sales.length === 0 ? null : Math.round((repeat / sales.length) * 100),
  };
}

export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function dollars(n: number | null): string {
  if (n === null) return "—";
  return `US$${n.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
