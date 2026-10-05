import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatReply, type ChatTurn } from "@/lib/ai";
import { clientIp, rateLimited } from "@/lib/rate-limit";

const MAX_TURNS = 30;
const MAX_CHARS = 2000;

export async function POST(req: Request, { params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  if (rateLimited(`chat:${clientIp(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many messages. Please wait a minute." }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { visitorId?: unknown; message?: unknown } | null;
  const visitorId = typeof body?.visitorId === "string" ? body.visitorId.slice(0, 64) : "";
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, MAX_CHARS) : "";
  if (!visitorId || !message) return NextResponse.json({ error: "Message required." }, { status: 400 });

  const bot = await db.chatbot.findFirst({ where: { id: botId, active: true }, include: { workspace: true } });
  if (!bot) return NextResponse.json({ error: "This chat is not available." }, { status: 404 });

  const convo =
    (await db.chatConversation.findFirst({ where: { chatbotId: bot.id, visitorId }, orderBy: { updatedAt: "desc" } })) ??
    (await db.chatConversation.create({ data: { chatbotId: bot.id, visitorId } }));

  const turns = JSON.parse(convo.messages) as ChatTurn[];
  if (turns.length >= MAX_TURNS * 2) {
    return NextResponse.json({ reply: "This conversation has reached its limit. Please contact the team directly." });
  }
  turns.push({ role: "user", text: message });

  let leadId = convo.leadId;
  let reply: string;
  try {
    reply = await chatReply(bot.workspace, bot, turns, async (lead) => {
      const data = {
        name: lead.name.slice(0, 200),
        email: lead.email.slice(0, 200),
        phone: lead.phone.slice(0, 50),
        notes: lead.notes.slice(0, 2000),
      };
      if (leadId) {
        await db.lead.update({ where: { id: leadId }, data });
      } else {
        const created = await db.lead.create({ data: { ...data, workspaceId: bot.workspaceId, source: "chat" } });
        leadId = created.id;
      }
    });
  } catch (err) {
    console.error("chat reply failed", err);
    return NextResponse.json({ error: "The assistant is unavailable just now. Please try again shortly." }, { status: 503 });
  }

  turns.push({ role: "assistant", text: reply });
  await db.chatConversation.update({
    where: { id: convo.id },
    data: { messages: JSON.stringify(turns), leadId },
  });
  return NextResponse.json({ reply });
}
