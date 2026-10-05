// Creates the first admin account and a demo business. Safe to run more than once.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const db = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "";
  if (!email || password.length < 10) {
    throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (10+ characters) in .env first.");
  }
  await db.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Edward", role: "ADMIN", passwordHash: await bcrypt.hash(password, 12) },
  });

  if (await db.workspace.findUnique({ where: { slug: "demo-bakery" } })) return;
  const w = await db.workspace.create({
    data: {
      name: "Demo Bakery",
      slug: "demo-bakery",
      publicKey: randomBytes(16).toString("base64url"),
      industry: "Bakery and café, Harare",
      audience: "Families in Borrowdale and Avondale ordering birthday cakes; offices ordering platters for meetings.",
      promise: "Cakes baked the same morning, delivered on time anywhere in Harare.",
      proof: "Over 400 birthday cakes delivered in 2026.",
      offers: "Birthday cakes from $35. Office platters from $60. Free delivery within 10 km. Open Mon–Sat 7:00–18:00.",
      voice: "Warm, neighbourly, never pushy. British spelling.",
    },
  });
  const day = (d: number) => new Date(Date.now() - d * 86_400_000);
  await db.lead.createMany({
    data: [
      { workspaceId: w.id, name: "Tariro M.", phone: "0772000001", source: "whatsapp", stage: "WON", value: 45, createdAt: day(40), wonAt: day(38) },
      { workspaceId: w.id, name: "Tariro M.", phone: "0772000001", source: "chat", stage: "WON", value: 60, createdAt: day(6), wonAt: day(4) },
      { workspaceId: w.id, name: "Acme Insurance", email: "office@acme.example", source: "email", stage: "QUOTED", notes: "Platters for 30, Friday", createdAt: day(3) },
      { workspaceId: w.id, name: "Rudo K.", source: "web", stage: "NEW", notes: "Wedding cake enquiry", createdAt: day(1) },
    ],
  });
  await db.chatbot.create({
    data: {
      workspaceId: w.id,
      name: "Bakery Assistant",
      knowledge: "Orders need 48 hours' notice. Payment by EcoCash or card on delivery. Gluten-free sponge available.",
    },
  });
}

main()
  .then(() => console.log("Seed complete."))
  .finally(() => db.$disconnect());
