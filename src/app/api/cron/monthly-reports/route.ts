import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildReport } from "@/lib/reports";
import { lastCompleteMonth } from "@/lib/metrics";
import { cronAuthorised } from "@/lib/cron";

export const maxDuration = 300;

// Run on the first of each month. Produces last month's report for every business that lacks one.
export async function GET(req: Request) {
  if (!cronAuthorised(req)) return new Response("Unauthorised", { status: 401 });
  const month = lastCompleteMonth();
  const workspaces = await db.workspace.findMany({
    where: { reports: { none: { month } }, leads: { some: {} } },
  });
  const results = [];
  for (const w of workspaces) {
    try {
      await buildReport(w, month);
      results.push({ workspace: w.slug, ok: true });
    } catch (err) {
      results.push({ workspace: w.slug, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return NextResponse.json({ month, results });
}
