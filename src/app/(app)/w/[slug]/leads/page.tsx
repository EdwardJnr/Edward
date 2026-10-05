import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth";
import { addLead, deleteLead, updateLead } from "@/app/actions/workspace";
import { Flash } from "@/components/flash";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string>> };

const STAGES = ["NEW", "CONTACTED", "QUOTED", "WON", "LOST"];

export default async function LeadsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { workspace, canEdit } = await requireWorkspace(slug);
  const stage = STAGES.includes(sp.stage) ? sp.stage : undefined;
  const leads = await db.lead.findMany({
    where: { workspaceId: workspace.id, ...(stage ? { stage } : {}) },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  return (
    <>
      <div className="head">
        <div>
          <h1>Leads</h1>
          <p>Every enquiry, from first message to sale. Website forms, chatbots and email add leads here automatically.</p>
        </div>
        <div className="row">
          <a className={`btn small ${stage ? "ghost" : ""}`} href={`/w/${slug}/leads`}>All</a>
          {STAGES.map((s) => (
            <a key={s} className={`btn small ${stage === s ? "" : "ghost"}`} href={`/w/${slug}/leads?stage=${s}`}>
              {s.toLowerCase()}
            </a>
          ))}
        </div>
      </div>
      <Flash params={sp} />

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Source</th>
              <th>Notes</th>
              <th>Stage and value (USD)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id}>
                <td>
                  {l.name}
                  <div className="muted small">{l.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                </td>
                <td className="small">
                  {l.email && <div>{l.email}</div>}
                  {l.phone && <div>{l.phone}</div>}
                </td>
                <td>
                  <span className="pill grey">{l.source}</span>
                </td>
                <td className="small" style={{ maxWidth: 260 }}>{l.notes}</td>
                <td>
                  {canEdit ? (
                    <form action={updateLead.bind(null, slug, l.id)} className="row">
                      <select name="stage" defaultValue={l.stage}>
                        {STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s.toLowerCase()}
                          </option>
                        ))}
                      </select>
                      <input name="value" type="number" min="0" step="0.01" defaultValue={l.value || ""} placeholder="0" style={{ width: 90 }} />
                      <button className="btn small ghost">Save</button>
                    </form>
                  ) : (
                    <span className="pill">{l.stage.toLowerCase()}</span>
                  )}
                </td>
                <td>
                  {canEdit && (
                    <form action={deleteLead.bind(null, slug, l.id)}>
                      <button className="btn small danger">Delete</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No leads here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div className="grid g2">
          <form action={addLead.bind(null, slug)} className="card">
            <h2>Add a lead</h2>
            <p className="muted small">For WhatsApp chats, phone calls and walk-ins.</p>
            <div className="grid g2">
              <div>
                <label htmlFor="name">Name</label>
                <input id="name" name="name" required />
              </div>
              <div>
                <label htmlFor="source">Source</label>
                <select id="source" name="source" defaultValue="whatsapp">
                  <option value="whatsapp">WhatsApp</option>
                  <option value="manual">Phone or walk-in</option>
                  <option value="web">Website</option>
                  <option value="email">Email</option>
                </select>
              </div>
              <div>
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" />
              </div>
              <div>
                <label htmlFor="phone">Phone</label>
                <input id="phone" name="phone" />
              </div>
            </div>
            <label htmlFor="notes">What they want</label>
            <textarea id="notes" name="notes" />
            <div style={{ marginTop: 12 }}>
              <button className="btn">Add lead</button>
            </div>
          </form>
          <div className="card">
            <h2>Website enquiry form</h2>
            <p className="small">Point any form on the business&apos;s website at this address. Fields: name, email, phone, message.</p>
            <pre>{`<form method="POST" action="${appUrl}/api/public/leads/${workspace.publicKey}">
  <input name="name" required>
  <input name="email" type="email">
  <input name="phone">
  <textarea name="message"></textarea>
  <button>Send</button>
</form>`}</pre>
          </div>
        </div>
      )}
    </>
  );
}
