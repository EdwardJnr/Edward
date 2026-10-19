import "server-only";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { clients, db } from "@/db";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getClient(id: string) {
  await connection();
  if (!UUID.test(id)) notFound();
  const client = await db.query.clients.findFirst({ where: eq(clients.id, id) });
  if (!client) notFound();
  return client;
}
