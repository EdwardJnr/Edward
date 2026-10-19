import "server-only";
import { eq } from "drizzle-orm";
import { db, leads, spend } from "@/db";
import { computeMonth, previousMonth } from "./metrics";

export async function loadMonth(clientId: string, month: string) {
  const [allLeads, spendRows] = await Promise.all([
    db.query.leads.findMany({ where: eq(leads.clientId, clientId) }),
    db.query.spend.findMany({ where: eq(spend.clientId, clientId) }),
  ]);
  const spendFor = (m: string) => spendRows.find((s) => s.month === m)?.amountCents ?? null;
  const prev = previousMonth(month);
  return {
    leads: allLeads,
    current: computeMonth(allLeads, month, spendFor(month)),
    previous: computeMonth(allLeads, prev, spendFor(prev)),
  };
}
