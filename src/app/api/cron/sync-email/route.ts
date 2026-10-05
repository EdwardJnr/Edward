import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncMailbox } from "@/lib/email";
import { cronAuthorised } from "@/lib/cron";

export const maxDuration = 300;

// Run every 10–15 minutes.
export async function GET(req: Request) {
  if (!cronAuthorised(req)) return new Response("Unauthorised", { status: 401 });
  const mailboxes = await db.mailbox.findMany({ include: { workspace: true } });
  const results = [];
  for (const m of mailboxes) {
    try {
      results.push({ workspace: m.workspace.slug, ...(await syncMailbox(m)) });
    } catch (err) {
      results.push({ workspace: m.workspace.slug, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return NextResponse.json({ results });
}
