import Link from "next/link";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth";
import { generateReport } from "@/app/actions/workspace";
import { lastCompleteMonth } from "@/lib/metrics";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string>> };

export default async function ReportsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { workspace, canEdit } = await requireWorkspace(slug);
  const reports = await db.report.findMany({ where: { workspaceId: workspace.id }, orderBy: { month: "desc" } });

  return (
    <>
      <div className="head">
        <div>
          <h1>Monthly reports</h1>
          <p>Stage five: enquiries, sales and repeat customers, with what to do next. Reports are produced automatically on the first of each month.</p>
        </div>
      </div>
      <Flash params={sp} />
      {canEdit && (
        <form action={generateReport.bind(null, slug)} className="card row">
          <div>
            <label htmlFor="month">Month</label>
            <input id="month" name="month" type="month" defaultValue={lastCompleteMonth()} required />
          </div>
          <div style={{ alignSelf: "flex-end" }}>
            <SubmitButton pending="Writing report…">Produce report</SubmitButton>
          </div>
        </form>
      )}
      <div className="card">
        {reports.map((r) => (
          <p key={r.id}>
            <Link href={`/w/${slug}/reports/${r.month}`}>
              {new Date(`${r.month}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}
            </Link>
          </p>
        ))}
        {reports.length === 0 && <p className="muted">No reports yet.</p>}
      </div>
    </>
  );
}
