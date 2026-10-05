import Link from "next/link";
import { db } from "@/lib/db";
import { isTeam, requireUser, visibleWorkspaces } from "@/lib/auth";
import { computeMetrics } from "@/lib/metrics";
import { createWorkspace } from "@/app/actions/admin";
import { Flash } from "@/components/flash";
import { aiConfigured } from "@/lib/ai";

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const workspaces = await visibleWorkspaces(user);
  const month = new Date().toISOString().slice(0, 7);
  const rows = await Promise.all(
    workspaces.map(async (w) => {
      const [leads, drafts, emails] = await Promise.all([
        db.lead.findMany({ where: { workspaceId: w.id } }),
        db.contentItem.count({ where: { workspaceId: w.id, status: "DRAFT" } }),
        db.emailMessage.count({ where: { workspaceId: w.id, status: "DRAFTED" } }),
      ]);
      return { w, m: computeMetrics(leads, month), drafts, emails };
    }),
  );

  return (
    <>
      <div className="head">
        <div>
          <h1>Good day, {user.name.split(" ")[0]}</h1>
          <p>Every business at a glance for this month.</p>
        </div>
      </div>
      <Flash params={sp} />
      {!aiConfigured() && (
        <div className="flash err">The Claude API key is not set, so AI features are off. Add ANTHROPIC_API_KEY to the environment.</div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Business</th>
              <th>Enquiries</th>
              <th>Sales</th>
              <th>Revenue</th>
              <th>Waiting for you</th>
              <th>Plan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ w, m, drafts, emails }) => (
              <tr key={w.id}>
                <td>
                  <Link href={`/w/${w.slug}`}>{w.name}</Link>
                  <div className="muted small">{w.industry}</div>
                </td>
                <td>{m.enquiries}</td>
                <td>{m.sales}</td>
                <td>${m.revenue.toLocaleString("en-GB")}</td>
                <td className="small">
                  {emails > 0 && <div>{emails} email repl{emails === 1 ? "y" : "ies"}</div>}
                  {drafts > 0 && <div>{drafts} content draft{drafts === 1 ? "" : "s"}</div>}
                  {!emails && !drafts && <span className="muted">Nothing</span>}
                </td>
                <td>
                  <span className={w.planStatus === "ACTIVE" ? "pill" : "pill grey"}>
                    {w.plan === "NONE" ? "No plan" : w.plan.toLowerCase()}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No businesses yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isTeam(user.role) && (
        <form action={createWorkspace} className="card">
          <h2>Add a business</h2>
          <div className="row">
            <div className="grow">
              <label htmlFor="name">Business name</label>
              <input id="name" name="name" required />
            </div>
            <div className="grow">
              <label htmlFor="industry">Industry</label>
              <input id="industry" name="industry" placeholder="Bakery, law firm, NGO…" />
            </div>
            <button className="btn" style={{ alignSelf: "flex-end" }}>
              Add
            </button>
          </div>
        </form>
      )}
    </>
  );
}
