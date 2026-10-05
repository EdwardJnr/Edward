import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth";
import type { MonthMetrics } from "@/lib/metrics";

type Props = { params: Promise<{ slug: string; month: string }> };

export default async function ReportPage({ params }: Props) {
  const { slug, month } = await params;
  const { workspace } = await requireWorkspace(slug);
  const report = await db.report.findUnique({ where: { workspaceId_month: { workspaceId: workspace.id, month } } });
  if (!report) notFound();
  const { current: m, previous: p } = JSON.parse(report.metrics) as { current: MonthMetrics; previous: MonthMetrics };
  const label = new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const rows: [string, string, string][] = [
    ["Enquiries", String(m.enquiries), String(p.enquiries)],
    ["Sales", String(m.sales), String(p.sales)],
    ["Revenue", `$${m.revenue.toLocaleString("en-GB")}`, `$${p.revenue.toLocaleString("en-GB")}`],
    ["Conversion", `${Math.round(m.conversionRate * 100)}%`, `${Math.round(p.conversionRate * 100)}%`],
    ["Average sale", `$${m.averageSale.toLocaleString("en-GB")}`, `$${p.averageSale.toLocaleString("en-GB")}`],
    ["Repeat customers", String(m.repeatCustomers), String(p.repeatCustomers)],
  ];

  return (
    <>
      <div className="head">
        <div>
          <h1>
            {workspace.name} · {label}
          </h1>
          <p>Prepared by Katungo.</p>
        </div>
      </div>
      <div className="grid g2">
        <div className="card">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>{label}</th>
                <th>Month before</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([k, a, b]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>
                    <strong>{a}</strong>
                  </td>
                  <td className="muted">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3 style={{ marginTop: 18 }}>Where enquiries came from</h3>
          {Object.entries(m.bySource).map(([source, n]) => (
            <div key={source} className="row" style={{ justifyContent: "space-between" }}>
              <span>{source}</span>
              <span>{n}</span>
            </div>
          ))}
          {Object.keys(m.bySource).length === 0 && <p className="muted">No enquiries recorded.</p>}
        </div>
        <div className="card">
          <div className="prose">{report.narrative}</div>
        </div>
      </div>
    </>
  );
}
