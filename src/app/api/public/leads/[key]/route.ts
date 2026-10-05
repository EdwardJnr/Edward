import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientIp, rateLimited } from "@/lib/rate-limit";

// Accepts enquiries from any website form (HTML form post or JSON fetch).
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (rateLimited(`lead:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many submissions." }, { status: 429, headers: CORS });
  }
  const workspace = await db.workspace.findUnique({ where: { publicKey: key } });
  if (!workspace) return NextResponse.json({ error: "Unknown form." }, { status: 404, headers: CORS });

  const isJson = req.headers.get("content-type")?.includes("application/json");
  let fields: Record<string, unknown> = {};
  try {
    fields = isJson ? await req.json() : Object.fromEntries(await req.formData());
  } catch {
    return NextResponse.json({ error: "Could not read the form." }, { status: 400, headers: CORS });
  }
  const get = (k: string, max: number) => (typeof fields[k] === "string" ? (fields[k] as string).trim().slice(0, max) : "");

  // Honeypot: real visitors never fill a hidden "_gotcha" field.
  const spam = !!get("_gotcha", 10);
  const name = get("name", 200);
  if (!spam && name) {
    await db.lead.create({
      data: {
        workspaceId: workspace.id,
        name,
        email: get("email", 200),
        phone: get("phone", 50),
        notes: get("message", 4000),
        source: "web",
      },
    });
  } else if (!spam) {
    return NextResponse.json({ error: "Name is required." }, { status: 400, headers: CORS });
  }

  if (isJson) return NextResponse.json({ ok: true }, { headers: CORS });
  const back = req.headers.get("referer");
  if (back) return NextResponse.redirect(back, { status: 303 });
  return new Response("<p style='font-family:sans-serif'>Thank you. We shall be in touch shortly.</p>", {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
