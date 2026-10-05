import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth";
import { createContent, deleteContent, updateContent } from "@/app/actions/workspace";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string>> };

const CHANNELS = ["instagram", "facebook", "linkedin", "tiktok", "whatsapp status", "email", "google ad", "website"];
const FORMATS = ["post", "caption", "carousel copy", "ad", "video script", "newsletter", "offer announcement"];

export default async function ContentPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { workspace, canEdit } = await requireWorkspace(slug);
  const items = await db.contentItem.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <>
      <div className="head">
        <div>
          <h1>Content studio</h1>
          <p>Written from the brand profile, in the brand&apos;s voice. Nothing goes out until someone approves it.</p>
        </div>
      </div>
      <Flash params={sp} />

      {canEdit && (
        <form action={createContent.bind(null, slug)} className="card">
          <div className="grid g3">
            <div>
              <label htmlFor="channel">Channel</label>
              <select id="channel" name="channel">
                {CHANNELS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="format">Format</label>
              <select id="format" name="format">
                {FORMATS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="count">How many</label>
              <select id="count" name="count" defaultValue="3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          <label htmlFor="brief">Brief</label>
          <textarea id="brief" name="brief" required placeholder="Launch of the new weekend brunch menu. Aim at families in Borrowdale. Push bookings for Saturday." />
          <div style={{ marginTop: 12 }}>
            <SubmitButton pending="Writing…">Write drafts</SubmitButton>
          </div>
        </form>
      )}

      {items.map((item) => (
        <div key={item.id} className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h3 style={{ margin: 0 }}>{item.title || item.format}</h3>
            <span className="row small">
              <span className="pill grey">{item.channel}</span>
              <span className="pill grey">{item.format}</span>
              <span className={item.status === "DRAFT" ? "pill warn" : "pill"}>{item.status.toLowerCase()}</span>
            </span>
          </div>
          {canEdit ? (
            <form action={updateContent.bind(null, slug, item.id)}>
              <textarea name="body" defaultValue={item.body} style={{ minHeight: 150, marginTop: 10 }} />
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn small ghost">Save edits</button>
                {item.status === "DRAFT" && (
                  <button className="btn small" name="status" value="APPROVED">
                    Approve
                  </button>
                )}
                {item.status === "APPROVED" && (
                  <button className="btn small" name="status" value="PUBLISHED">
                    Mark published
                  </button>
                )}
                <button className="btn small danger" formAction={deleteContent.bind(null, slug, item.id)}>
                  Delete
                </button>
              </div>
            </form>
          ) : (
            <p className="prose" style={{ marginTop: 10 }}>{item.body}</p>
          )}
          <p className="muted small" style={{ marginTop: 8 }}>Brief: {item.brief}</p>
        </div>
      ))}
      {items.length === 0 && <p className="muted">No content yet.</p>}
    </>
  );
}
