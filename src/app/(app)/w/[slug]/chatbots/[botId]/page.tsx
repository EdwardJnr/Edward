import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth";
import { deleteChatbot, saveChatbot } from "@/app/actions/workspace";
import { Flash } from "@/components/flash";

type Props = { params: Promise<{ slug: string; botId: string }>; searchParams: Promise<Record<string, string>> };

export default async function ChatbotPage({ params, searchParams }: Props) {
  const { slug, botId } = await params;
  const sp = await searchParams;
  const { workspace, canEdit } = await requireWorkspace(slug);
  const bot = await db.chatbot.findFirst({ where: { id: botId, workspaceId: workspace.id } });
  if (!bot) notFound();
  const conversations = await db.chatConversation.findMany({
    where: { chatbotId: bot.id },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  return (
    <>
      <div className="head">
        <div>
          <h1>{bot.name}</h1>
          <p>
            Try it: <a href={`/embed/${bot.id}`} target="_blank">open the chat window</a>.
          </p>
        </div>
      </div>
      <Flash params={sp} />

      <div className="card">
        <h2>Put it on a website</h2>
        <p className="small">Paste this just before the closing &lt;/body&gt; tag. It adds a chat button to the bottom-right corner.</p>
        <pre>{`<script src="${appUrl}/widget.js" data-bot="${bot.id}" async></script>`}</pre>
      </div>

      <form action={saveChatbot.bind(null, slug, bot.id)} className="card">
        <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0 }}>
          <div className="grid g2">
            <div>
              <label htmlFor="name">Name</label>
              <input id="name" name="name" defaultValue={bot.name} required />
            </div>
            <div>
              <label htmlFor="welcome">Welcome message</label>
              <input id="welcome" name="welcome" defaultValue={bot.welcome} />
            </div>
          </div>
          <label htmlFor="knowledge">Knowledge · FAQs, prices, opening hours, directions, policies</label>
          <textarea id="knowledge" name="knowledge" defaultValue={bot.knowledge} style={{ minHeight: 200 }} />
          <label htmlFor="instructions">Extra instructions · e.g. &quot;Reply in Shona if the visitor writes in Shona.&quot;</label>
          <textarea id="instructions" name="instructions" defaultValue={bot.instructions} />
          <label className="row" style={{ marginTop: 12, color: "var(--ink)" }}>
            <input type="checkbox" name="active" defaultChecked={bot.active} style={{ width: "auto" }} />
            Live on the website
          </label>
          {canEdit && (
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn">Save</button>
              <button className="btn danger" formAction={deleteChatbot.bind(null, slug, bot.id)} formNoValidate>
                Delete chatbot
              </button>
            </div>
          )}
        </fieldset>
      </form>

      <div className="card">
        <h2>Recent conversations</h2>
        {conversations.map((c) => {
          const turns = JSON.parse(c.messages) as { role: string; text: string }[];
          return (
            <details key={c.id} style={{ marginBottom: 8 }}>
              <summary>
                {c.updatedAt.toLocaleString("en-GB")} · {turns.length} message(s) {c.leadId && <span className="pill">lead captured</span>}
              </summary>
              {turns.map((t, i) => (
                <p key={i} className="small">
                  <strong>{t.role === "user" ? "Visitor" : bot.name}:</strong> {t.text}
                </p>
              ))}
            </details>
          );
        })}
        {conversations.length === 0 && <p className="muted">None yet.</p>}
      </div>
    </>
  );
}
