import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ChatWindow } from "@/components/chat-window";

export default async function EmbedPage({ params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  const bot = await db.chatbot.findFirst({ where: { id: botId, active: true }, include: { workspace: true } });
  if (!bot) notFound();
  return <ChatWindow botId={bot.id} name={bot.name} business={bot.workspace.name} welcome={bot.welcome} />;
}
