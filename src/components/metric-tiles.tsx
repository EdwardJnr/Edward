import { dollars, type MonthMetrics } from "@/lib/metrics";

function change(
  current: number | null,
  previous: number | null,
  { lowerIsBetter = false, money = false } = {},
) {
  if (current === null || previous === null) return null;
  const diff = current - previous;
  if (diff === 0) return "Level with last month";
  const better = lowerIsBetter ? diff < 0 : diff > 0;
  const amount = Math.abs(Math.round(diff * 100) / 100);
  return `${diff > 0 ? "Up" : "Down"} ${money ? dollars(amount) : amount.toLocaleString("en-GB")} on last month${better ? " · better" : " · worse"}`;
}

// The four numbers every client sees first, each against the previous month.
export function MetricTiles({ current, previous }: { current: MonthMetrics; previous: MonthMetrics }) {
  const tiles = [
    {
      label: "Enquiries",
      value: current.enquiries.toLocaleString("en-GB"),
      note: change(current.enquiries, previous.enquiries),
    },
    {
      label: "Cost per enquiry",
      value: dollars(current.costPerEnquiryDollars),
      note:
        current.spendDollars === null
          ? "Add this month’s spend in the report"
          : change(current.costPerEnquiryDollars, previous.costPerEnquiryDollars, { lowerIsBetter: true, money: true }),
    },
    {
      label: "Sales from tracked leads",
      value: dollars(current.salesDollars),
      note: `${current.salesCount} won · ${change(current.salesDollars, previous.salesDollars, { money: true }) ?? ""}`,
    },
    {
      label: "Repeat customers",
      value: current.repeatSharePercent === null ? "—" : `${current.repeatSharePercent}%`,
      note: current.salesCount === 0 ? "No sales closed yet this month" : "Share of this month’s sales",
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="card border-t-4 border-t-mint">
          <p className="label">{t.label}</p>
          <p className="mt-2 font-serif text-4xl text-teal">{t.value}</p>
          {t.note && <p className="mt-2 text-sm text-muted">{t.note}</p>}
        </div>
      ))}
    </div>
  );
}
