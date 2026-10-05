import Link from "next/link";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth";
import { computeMetrics, previousMonth } from "@/lib/metrics";

type Props = { params: Promise<{ slug: string }> };

export default async function Overview({ params }: Props) {
  const { slug } = await params;
  const { workspace } = await requireWorkspace(slug);
  const month = new Date().toISOString().slice(0, 7);
  const [leads, drafts, replies, bots] = await Promise.all([
    db.lead.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "desc" } }),
    db.contentItem.count({ where: { workspaceId: workspace.id, status: "DRAFT" } }),
    db.emailMessage.count({ where: { workspaceId: workspace.id, status: "DRAFTED" } }),
    db.chatbot.count({ where: { workspaceId: workspace.id, active: true } }),
  ]);
  const m = computeMetrics(leads, month);
  const prev = computeMetrics(leads, previousMonth(month));
  const delta = (a: number, b: number) => (b ? ` · ${a >= b ? "+" : ""}${Math.round(((a - b) / b) * 100)}% on last month` : "");

  const profileGaps = (["audience", "promise", "proof", "offers", "voice"] as const).filter((k) => !workspace[k].trim());

  return (
    <>
      <div className="head">
        <div>
          <h1>{workspace.name}</h1>
          <p>This month so far.</p>
        </div>
      </div>

      {profileGaps.length > 0 && (
        <div className="flash err">
          The brand profile is missing: {profileGaps.join(", ")}. The AI writes better with it.{" "}
          <Link href={`/w/${slug}/brand`}>Complete it</Link>
        </div>
      )}

      <div className="grid g4" style={{ marginBottom: 18 }}>
        <div className="stat">
          <div className="n">{m.enquiries}</div>
          <div className="l">Enquiries{delta(m.enquiries, prev.enquiries)}</div>
        </div>
        <div className="stat">
          <div className="n">{m.sales}</div>
          <div className="l">Sales · {Math.round(m.conversionRate * 100)}% conversion</div>
        </div>
        <div className="stat">
          <div className="n">${m.revenue.toLocaleString("en-GB")}</div>
          <div className="l">Revenue{delta(m.revenue, prev.revenue)}</div>
        </div>
        <div className="stat">
          <div className="n">{m.repeatCustomers}</div>
          <div className="l">Repeat customers</div>
        </div>
      </div>

      <div className="grid g2">
        <div className="card">
          <h2>Waiting for you</h2>
          <p>
            <Link href={`/w/${slug}/inbox`}>{replies} email repl{replies === 1 ? "y" : "ies"}</Link> drafted and ready to approve.
          </p>
          <p>
            <Link href={`/w/${slug}/content`}>{drafts} content draft{drafts === 1 ? "" : "s"}</Link> to review.
          </p>
          <p>
            <Link href={`/w/${slug}/chatbots`}>{bots} chatbot{bots === 1 ? "" : "s"}</Link> live.
          </p>
        </div>
        <div className="card">
          <h2>Latest leads</h2>
          {leads.slice(0, 6).map((l) => (
            <div key={l.id} className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
              <span>{l.name}</span>
              <span className="row small">
                <span className="pill grey">{l.source}</span>
                <span className="pill">{l.stage.toLowerCase()}</span>
              </span>
            </div>
          ))}
          {leads.length === 0 && <p className="muted">None yet.</p>}
        </div>
      </div>
    </>
  );
}
