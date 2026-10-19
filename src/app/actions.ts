"use server";

import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { brandProfiles, clients, contentItems, db, leads, reports, spend } from "@/db";
import { SESSION_COOKIE, isValidSession, safeEqual, sessionToken } from "@/lib/auth";
import { generateBrandProfile, generateContentPlan, writeCommentary } from "@/lib/ai";
import { CHANNELS } from "@/lib/schemas";
import { readWebsite } from "@/lib/site";
import { computeMonth, inMonth, isMonth, previousMonth } from "@/lib/metrics";

export type FormState = { error?: string; message?: string } | undefined;

const STATUSES = ["idea", "approved", "scheduled", "published"] as const;
const STAGES = ["new", "contacted", "qualified", "won", "lost"] as const;

async function requireSession() {
  const store = await cookies();
  if (!(await isValidSession(store.get(SESSION_COOKIE)?.value))) redirect("/login");
}

const text = (f: FormData, key: string) => {
  const v = f.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

function toCents(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong. Please try again.";
}

// ── Session ────────────────────────────────────────────────────────────────

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return { error: "APP_PASSWORD is not set on the server." };
  if (!safeEqual(text(form, "password") ?? "", expected)) return { error: "That password is not right." };

  const store = await cookies();
  store.set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  const next = text(form, "next");
  redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

// ── Clients ────────────────────────────────────────────────────────────────

export async function createClient(_: FormState, form: FormData): Promise<FormState> {
  await requireSession();
  const name = text(form, "name");
  if (!name) return { error: "Give the client a name." };
  const [row] = await db
    .insert(clients)
    .values({
      name,
      website: text(form, "website"),
      sector: text(form, "sector"),
      notes: text(form, "notes"),
      leadToken: randomBytes(24).toString("base64url"),
    })
    .returning({ id: clients.id });
  redirect(`/clients/${row.id}/profile`);
}

export async function updateClient(clientId: string, _: FormState, form: FormData): Promise<FormState> {
  await requireSession();
  const name = text(form, "name");
  if (!name) return { error: "Give the client a name." };
  await db
    .update(clients)
    .set({ name, website: text(form, "website"), sector: text(form, "sector"), notes: text(form, "notes") })
    .where(eq(clients.id, clientId));
  revalidatePath(`/clients/${clientId}`, "layout");
  return { message: "Saved." };
}

// ── Stage 01–02: brand profile ─────────────────────────────────────────────

export async function buildProfile(clientId: string, _: FormState, form: FormData): Promise<FormState> {
  await requireSession();
  const client = await db.query.clients.findFirst({ where: eq(clients.id, clientId) });
  if (!client) return { error: "Client not found." };

  const website = text(form, "website") ?? client.website;
  let siteText: string | null = null;
  try {
    if (website) siteText = await readWebsite(website);
  } catch (e) {
    if (!client.notes) return { error: `${message(e)} Add notes about the business instead, then try again.` };
  }
  if (!siteText && !client.notes) return { error: "Add a website or some notes about the business first." };

  try {
    const data = await generateBrandProfile({
      name: client.name,
      sector: client.sector,
      notes: client.notes,
      siteText,
    });
    await db
      .insert(brandProfiles)
      .values({ clientId, data, sourceUrl: website })
      .onConflictDoUpdate({
        target: brandProfiles.clientId,
        set: { data, sourceUrl: website, updatedAt: new Date() },
      });
    if (website && website !== client.website) await db.update(clients).set({ website }).where(eq(clients.id, clientId));
  } catch (e) {
    return { error: message(e) };
  }
  revalidatePath(`/clients/${clientId}`, "layout");
  return { message: siteText ? "Profile built from the website and your notes." : "Profile built from your notes." };
}

// ── Stage 03–04: content calendar ──────────────────────────────────────────

export async function generatePlan(clientId: string, _: FormState, form: FormData): Promise<FormState> {
  await requireSession();
  const month = text(form, "month");
  if (!isMonth(month)) return { error: "Choose a month." };
  const channels = form.getAll("channels").filter((c): c is string => CHANNELS.includes(c as never));
  if (channels.length === 0) return { error: "Choose at least one channel." };
  const postsPerWeek = Math.min(Math.max(Number(text(form, "postsPerWeek") ?? 4), 1), 21);

  const client = await db.query.clients.findFirst({ where: eq(clients.id, clientId) });
  const profile = await db.query.brandProfiles.findFirst({ where: eq(brandProfiles.clientId, clientId) });
  if (!client) return { error: "Client not found." };
  if (!profile) return { error: "Build the brand profile first. The plan is written against it." };

  try {
    const plan = await generateContentPlan({
      name: client.name,
      profile: profile.data,
      month,
      channels,
      postsPerWeek,
      focus: text(form, "focus"),
    });
    const rows = plan.items
      .filter((i) => /^\d{4}-\d{2}-\d{2}$/.test(i.date) && inMonth(i.date, month))
      .map((i) => ({
        clientId,
        publishOn: i.date,
        channel: i.channel,
        segment: i.segment,
        title: i.title,
        caption: i.caption,
        visualBrief: i.visualBrief,
        proofType: i.proofType,
        cta: i.cta,
      }));
    if (rows.length === 0) return { error: "The plan came back without usable dates. Please try again." };
    await db.insert(contentItems).values(rows);
    revalidatePath(`/clients/${clientId}/calendar`);
    return { message: `Added ${rows.length} posts as ideas for review.` };
  } catch (e) {
    return { error: message(e) };
  }
}

export async function setContentStatus(clientId: string, id: string, status: string) {
  await requireSession();
  if (!STATUSES.includes(status as never)) return;
  await db
    .update(contentItems)
    .set({ status: status as (typeof STATUSES)[number] })
    .where(and(eq(contentItems.id, id), eq(contentItems.clientId, clientId)));
  revalidatePath(`/clients/${clientId}/calendar`);
}

export async function updateContent(clientId: string, id: string, _: FormState, form: FormData): Promise<FormState> {
  await requireSession();
  const caption = text(form, "caption");
  const publishOn = text(form, "publishOn");
  if (!caption) return { error: "The caption cannot be empty." };
  await db
    .update(contentItems)
    .set({
      caption,
      visualBrief: text(form, "visualBrief"),
      ...(publishOn && /^\d{4}-\d{2}-\d{2}$/.test(publishOn) ? { publishOn } : {}),
    })
    .where(and(eq(contentItems.id, id), eq(contentItems.clientId, clientId)));
  revalidatePath(`/clients/${clientId}/calendar`);
  return { message: "Saved." };
}

export async function deleteContent(clientId: string, id: string) {
  await requireSession();
  await db.delete(contentItems).where(and(eq(contentItems.id, id), eq(contentItems.clientId, clientId)));
  revalidatePath(`/clients/${clientId}/calendar`);
}

// ── Stage 04–05: leads ─────────────────────────────────────────────────────

export async function addLead(clientId: string, _: FormState, form: FormData): Promise<FormState> {
  await requireSession();
  const name = text(form, "name");
  const source = text(form, "source");
  if (!name || !source) return { error: "A lead needs a name and a source." };
  await db.insert(leads).values({
    clientId,
    name,
    source,
    contact: text(form, "contact"),
    segment: text(form, "segment"),
    isRepeat: form.get("isRepeat") === "on",
    firstContactOn: text(form, "firstContactOn") ?? new Date().toISOString().slice(0, 10),
    notes: text(form, "notes"),
  });
  revalidatePath(`/clients/${clientId}`, "layout");
  return { message: `${name} added.` };
}

export async function updateLead(clientId: string, id: string, _: FormState, form: FormData): Promise<FormState> {
  await requireSession();
  const stage = text(form, "stage");
  if (!STAGES.includes(stage as never)) return { error: "Choose a stage." };
  const closing = stage === "won" || stage === "lost";
  const closedOn = text(form, "closedOn");
  if (stage === "won" && !text(form, "value")) return { error: "Add the sale value before marking it won." };
  await db
    .update(leads)
    .set({
      stage: stage as (typeof STAGES)[number],
      valueCents: toCents(text(form, "value")),
      closedOn: closing ? (closedOn ?? new Date().toISOString().slice(0, 10)) : null,
      isRepeat: form.get("isRepeat") === "on",
    })
    .where(and(eq(leads.id, id), eq(leads.clientId, clientId)));
  revalidatePath(`/clients/${clientId}`, "layout");
  return { message: "Updated." };
}

export async function deleteLead(clientId: string, id: string) {
  await requireSession();
  await db.delete(leads).where(and(eq(leads.id, id), eq(leads.clientId, clientId)));
  revalidatePath(`/clients/${clientId}`, "layout");
}

// ── Stage 05: monthly report ───────────────────────────────────────────────

export async function saveSpend(clientId: string, month: string, _: FormState, form: FormData): Promise<FormState> {
  await requireSession();
  if (!isMonth(month)) return { error: "Invalid month." };
  const amountCents = toCents(text(form, "amount"));
  if (amountCents === null) return { error: "Enter the month’s total marketing spend in US dollars." };
  await db
    .insert(spend)
    .values({ clientId, month, amountCents })
    .onConflictDoUpdate({ target: [spend.clientId, spend.month], set: { amountCents } });
  revalidatePath(`/clients/${clientId}`, "layout");
  return { message: "Spend saved." };
}

export async function generateReportCommentary(clientId: string, month: string): Promise<FormState> {
  await requireSession();
  if (!isMonth(month)) return { error: "Invalid month." };
  const client = await db.query.clients.findFirst({ where: eq(clients.id, clientId) });
  if (!client) return { error: "Client not found." };
  const prev = previousMonth(month);
  const [allLeads, spendRows] = await Promise.all([
    db.query.leads.findMany({ where: eq(leads.clientId, clientId) }),
    db.query.spend.findMany({ where: eq(spend.clientId, clientId) }),
  ]);
  const spendFor = (m: string) => spendRows.find((s) => s.month === m)?.amountCents ?? null;

  try {
    const commentary = await writeCommentary({
      name: client.name,
      month,
      current: computeMonth(allLeads, month, spendFor(month)),
      previous: computeMonth(allLeads, prev, spendFor(prev)),
    });
    await db
      .insert(reports)
      .values({ clientId, month, commentary })
      .onConflictDoUpdate({
        target: [reports.clientId, reports.month],
        set: { commentary, generatedAt: new Date() },
      });
  } catch (e) {
    return { error: message(e) };
  }
  revalidatePath(`/clients/${clientId}`, "layout");
  return { message: "Commentary written." };
}
