import { and, eq } from "drizzle-orm";
import { db, reports, spend } from "@/db";
import { generateReportCommentary, saveSpend } from "@/app/actions";
import { getClient } from "@/lib/data";
import { loadMonth } from "@/lib/month-data";
import { currentMonth, formatMonth, isMonth } from "@/lib/metrics";
import { ActionForm, Field } from "@/components/action-form";
import { MetricTiles } from "@/components/metric-tiles";
import { MonthSwitcher } from "@/components/month-switcher";

export default async function ReportPage(props: PageProps<"/clients/[id]/report">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const month = typeof sp.month === "string" && isMonth(sp.month) ? sp.month : currentMonth();
  const client = await getClient(id);

  const [{ current, previous }, report, spendRow] = await Promise.all([
    loadMonth(id, month),
    db.query.reports.findFirst({ where: and(eq(reports.clientId, id), eq(reports.month, month)) }),
    db.query.spend.findFirst({ where: and(eq(spend.clientId, id), eq(spend.month, month)) }),
  ]);
  const sources = Object.entries(current.enquiriesBySource).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <MonthSwitcher month={month} basePath={`/clients/${id}/report`} />
        <p className="label">Monthly review · {client.name}</p>
      </div>

      <MetricTiles current={current} previous={previous} />

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <section className="flex flex-col gap-6">
          <div>
            <h2 className="mb-3 text-2xl">Where enquiries came from</h2>
            {sources.length === 0 ? (
              <p className="text-muted">No enquiries logged for {formatMonth(month)}.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {sources.map(([source, count]) => (
                  <li key={source} className="flex items-center gap-3">
                    <span className="w-28 text-sm">{source}</span>
                    <span
                      className="h-3 bg-teal"
                      style={{ width: `${Math.max(4, (count / current.enquiries) * 100)}%` }}
                      aria-hidden
                    />
                    <span className="text-sm font-semibold">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h2 className="text-2xl">Commentary</h2>
            {report?.commentary ? (
              <div className="mt-3 flex flex-col gap-4">
                <p className="font-serif text-xl text-teal">{report.commentary.headline}</p>
                <div>
                  <p className="label mb-2">What changed</p>
                  <ul className="flex list-disc flex-col gap-1 pl-5">
                    {report.commentary.whatChanged.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="label mb-2">Next month</p>
                  <ul className="flex list-disc flex-col gap-1 pl-5">
                    {report.commentary.nextSteps.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-muted">Not written yet. Log the month’s leads and spend first, then write it.</p>
            )}
            <div className="mt-5">
              <ActionForm
                action={generateReportCommentary.bind(null, id, month)}
                submitLabel={report ? "Rewrite commentary" : "Write commentary"}
                pendingLabel="Writing…"
                quiet
              />
            </div>
          </div>
        </section>

        <aside className="card h-fit">
          <h2 className="text-xl">Marketing spend</h2>
          <p className="mt-1 mb-4 text-sm text-muted">
            Everything spent on marketing in {formatMonth(month)}: ads, production and our fee. Used for cost per enquiry.
          </p>
          <ActionForm action={saveSpend.bind(null, id, month)} submitLabel="Save spend" quiet>
            <Field label="Total, US$">
              <input
                className="field"
                name="amount"
                inputMode="decimal"
                defaultValue={spendRow ? (spendRow.amountCents / 100).toString() : ""}
              />
            </Field>
          </ActionForm>
        </aside>
      </div>
    </div>
  );
}
