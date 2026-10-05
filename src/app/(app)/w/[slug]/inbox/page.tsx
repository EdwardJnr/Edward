import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth";
import { ignoreEmail, saveDraft, saveMailbox, sendDraft, syncNow } from "@/app/actions/inbox";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string>> };

const VIEWS = { todo: ["DRAFTED", "NEW"], sent: ["SENT"], done: ["IGNORED"] } as const;

export default async function InboxPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { workspace, canEdit } = await requireWorkspace(slug);
  const view = (sp.view as keyof typeof VIEWS) in VIEWS ? (sp.view as keyof typeof VIEWS) : "todo";
  const [mailbox, emails] = await Promise.all([
    db.mailbox.findUnique({ where: { workspaceId: workspace.id } }),
    db.emailMessage.findMany({
      where: { workspaceId: workspace.id, status: { in: [...VIEWS[view]] } },
      orderBy: { receivedAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <>
      <div className="head">
        <div>
          <h1>Inbox</h1>
          <p>Claude reads new email, files enquiries as leads and drafts a reply in the brand voice. You approve before anything is sent.</p>
        </div>
        {canEdit && mailbox && (
          <form action={syncNow.bind(null, slug)}>
            <SubmitButton pending="Reading…">Check for new email</SubmitButton>
          </form>
        )}
      </div>
      <Flash params={sp} />
      {mailbox?.lastError && <div className="flash err">Last sync failed: {mailbox.lastError}</div>}

      <div className="row" style={{ marginBottom: 14 }}>
        {(["todo", "sent", "done"] as const).map((v) => (
          <a key={v} href={`/w/${slug}/inbox?view=${v}`} className={`btn small ${view === v ? "" : "ghost"}`}>
            {v === "todo" ? "To do" : v === "sent" ? "Sent" : "Dealt with"}
          </a>
        ))}
        {mailbox?.lastSyncAt && (
          <span className="muted small">Last checked {mailbox.lastSyncAt.toLocaleString("en-GB")}</span>
        )}
      </div>

      {emails.map((e) => (
        <div key={e.id} className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <strong>{e.subject || "(no subject)"}</strong>
              <div className="muted small">
                {e.fromName} &lt;{e.fromAddr}&gt; · {e.receivedAt.toLocaleString("en-GB")}
              </div>
            </div>
            <span className="row small">
              {e.category && <span className={e.category === "enquiry" ? "pill" : "pill grey"}>{e.category}</span>}
              {e.leadId && <span className="pill">new lead</span>}
            </span>
          </div>
          {e.summary && <p style={{ marginTop: 10 }}>{e.summary}</p>}
          <details>
            <summary className="small muted">Original message</summary>
            <p className="prose small">{e.bodyText}</p>
          </details>
          {canEdit && e.status !== "SENT" && e.status !== "IGNORED" && (
            <form action={sendDraft.bind(null, slug, e.id)} style={{ marginTop: 10 }}>
              <label htmlFor={`body-${e.id}`}>Reply</label>
              <textarea id={`body-${e.id}`} name="body" defaultValue={e.draftReply} style={{ minHeight: 140 }} />
              <div className="row" style={{ marginTop: 8 }}>
                <SubmitButton pending="Sending…">Approve and send</SubmitButton>
                <button className="btn small ghost" formAction={saveDraft.bind(null, slug, e.id)}>
                  Save draft
                </button>
                <button className="btn small ghost" formAction={ignoreEmail.bind(null, slug, e.id)}>
                  No reply needed
                </button>
              </div>
            </form>
          )}
          {e.status === "SENT" && (
            <>
              <p className="muted small" style={{ marginTop: 10 }}>Sent {e.sentAt?.toLocaleString("en-GB")}</p>
              <p className="prose small">{e.draftReply}</p>
            </>
          )}
        </div>
      ))}
      {emails.length === 0 && <p className="muted">{mailbox ? "Nothing here." : "Connect a mailbox below to begin."}</p>}

      {canEdit && (
        <form action={saveMailbox.bind(null, slug)} className="card" style={{ marginTop: 24 }}>
          <h2>{mailbox ? "Mailbox settings" : "Connect a mailbox"}</h2>
          <p className="small muted">
            Works with any IMAP mailbox. For Gmail or Google Workspace, switch on 2-step verification and create an app password; use imap.gmail.com and smtp.gmail.com.
          </p>
          <div className="grid g3">
            <div>
              <label htmlFor="username">Email address</label>
              <input id="username" name="username" type="email" required defaultValue={mailbox?.username} />
            </div>
            <div>
              <label htmlFor="password">Password or app password</label>
              <input id="password" name="password" type="password" placeholder={mailbox ? "Unchanged" : ""} />
            </div>
            <div>
              <label htmlFor="fromName">Send as name</label>
              <input id="fromName" name="fromName" defaultValue={mailbox?.fromName ?? workspace.name} />
            </div>
            <div>
              <label htmlFor="imapHost">IMAP server</label>
              <input id="imapHost" name="imapHost" required defaultValue={mailbox?.imapHost ?? "imap.gmail.com"} />
            </div>
            <div>
              <label htmlFor="imapPort">IMAP port</label>
              <input id="imapPort" name="imapPort" type="number" defaultValue={mailbox?.imapPort ?? 993} />
            </div>
            <div />
            <div>
              <label htmlFor="smtpHost">SMTP server</label>
              <input id="smtpHost" name="smtpHost" required defaultValue={mailbox?.smtpHost ?? "smtp.gmail.com"} />
            </div>
            <div>
              <label htmlFor="smtpPort">SMTP port</label>
              <input id="smtpPort" name="smtpPort" type="number" defaultValue={mailbox?.smtpPort ?? 465} />
            </div>
          </div>
          <label className="row" style={{ marginTop: 14, color: "var(--ink)" }}>
            <input type="checkbox" name="autoSend" defaultChecked={mailbox?.autoSend} style={{ width: "auto" }} />
            Send replies to new enquiries automatically, without approval
          </label>
          <p className="small muted">Leave this off until you trust the drafts. Other email always waits for approval.</p>
          <div style={{ marginTop: 12 }}>
            <SubmitButton pending="Connecting…">Save and test connection</SubmitButton>
          </div>
        </form>
      )}
    </>
  );
}
