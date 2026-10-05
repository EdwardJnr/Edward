import Link from "next/link";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth";
import { createChatbot } from "@/app/actions/workspace";
import { Flash } from "@/components/flash";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string>> };

export default async function ChatbotsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { workspace, canEdit } = await requireWorkspace(slug);
  const bots = await db.chatbot.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { conversations: true } } },
  });

  return (
    <>
      <div className="head">
        <div>
          <h1>Chatbots</h1>
          <p>Website assistants that answer from the brand profile and your own knowledge, then hand interested visitors over as leads.</p>
        </div>
      </div>
      <Flash params={sp} />
      <div className="grid g3">
        {bots.map((b) => (
          <Link key={b.id} href={`/w/${slug}/chatbots/${b.id}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <h3>{b.name}</h3>
            <p className="small muted">{b._count.conversations} conversation(s)</p>
            <span className={b.active ? "pill" : "pill grey"}>{b.active ? "live" : "paused"}</span>
          </Link>
        ))}
      </div>
      {bots.length === 0 && <p className="muted">No chatbots yet.</p>}
      {canEdit && (
        <form action={createChatbot.bind(null, slug)} className="card row">
          <div className="grow">
            <label htmlFor="name">New chatbot name</label>
            <input id="name" name="name" placeholder={`${workspace.name} Assistant`} />
          </div>
          <button className="btn" style={{ alignSelf: "flex-end" }}>
            Create
          </button>
        </form>
      )}
    </>
  );
}
