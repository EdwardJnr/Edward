import { eq } from "drizzle-orm";
import { z } from "zod";
import { clients, db, leads } from "@/db";
import { safeEqual } from "@/lib/auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LeadInput = z.object({
  name: z.string().trim().min(1).max(200),
  source: z.string().trim().min(1).max(60),
  contact: z.string().trim().max(200).optional(),
  segment: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(4000).optional(),
  isRepeat: z.boolean().optional(),
});

// Lets website forms, a WhatsApp bot or Zapier add enquiries to a client's lead tracker.
export async function POST(request: Request, ctx: RouteContext<"/api/leads/[clientId]">) {
  const { clientId } = await ctx.params;
  if (!UUID.test(clientId)) return Response.json({ error: "Not found" }, { status: 404 });

  const client = await db.query.clients.findFirst({ where: eq(clients.id, clientId) });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!client || !safeEqual(token, client.leadToken)) {
    return Response.json({ error: "Unauthorised" }, { status: 401 });
  }

  const parsed = LeadInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid lead", issues: parsed.error.issues }, { status: 400 });
  }

  const [lead] = await db
    .insert(leads)
    .values({
      clientId,
      ...parsed.data,
      isRepeat: parsed.data.isRepeat ?? false,
      firstContactOn: new Date().toISOString().slice(0, 10),
    })
    .returning({ id: leads.id });
  return Response.json({ id: lead.id }, { status: 201 });
}
