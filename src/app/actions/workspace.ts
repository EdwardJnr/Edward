"use server";

import { db } from "@/lib/db";
import { requireWorkspaceEditor } from "@/lib/auth";
import { done, errorText, fail, str } from "@/lib/flash";
import { generateContent } from "@/lib/ai";
import { buildReport } from "@/lib/reports";
import { CHATBOT_LIMITS } from "@/lib/plans";

const STAGES = ["NEW", "CONTACTED", "QUOTED", "WON", "LOST"];
const SOURCES = ["web", "chat", "email", "whatsapp", "manual"];

// ---------- Brand profile ----------

export async function saveBrand(slug: string, form: FormData) {
  const { workspace } = await requireWorkspaceEditor(slug);
  await db.workspace.update({
    where: { id: workspace.id },
    data: {
      name: str(form, "name") || workspace.name,
      industry: str(form, "industry"),
      website: str(form, "website"),
      audience: str(form, "audience"),
      promise: str(form, "promise"),
      proof: str(form, "proof"),
      offers: str(form, "offers"),
      voice: str(form, "voice"),
    },
  });
  done(`/w/${slug}/brand`, "Brand profile saved. Every AI feature now writes from it.");
}

// ---------- Leads ----------

export async function addLead(slug: string, form: FormData) {
  const { workspace } = await requireWorkspaceEditor(slug);
  const name = str(form, "name");
  if (!name) fail(`/w/${slug}/leads`, "A lead needs a name.");
  const source = str(form, "source");
  await db.lead.create({
    data: {
      workspaceId: workspace.id,
      name,
      email: str(form, "email"),
      phone: str(form, "phone"),
      source: SOURCES.includes(source) ? source : "manual",
      notes: str(form, "notes"),
    },
  });
  done(`/w/${slug}/leads`, "Lead added.");
}

export async function updateLead(slug: string, leadId: string, form: FormData) {
  const { workspace } = await requireWorkspaceEditor(slug);
  const lead = await db.lead.findFirst({ where: { id: leadId, workspaceId: workspace.id } });
  if (!lead) fail(`/w/${slug}/leads`, "That lead no longer exists.");
  const stage = str(form, "stage");
  const value = Number(str(form, "value") || lead.value);
  if (!STAGES.includes(stage)) fail(`/w/${slug}/leads`, "Unknown stage.");
  await db.lead.update({
    where: { id: lead.id },
    data: {
      stage,
      value: Number.isFinite(value) && value >= 0 ? value : lead.value,
      wonAt: stage === "WON" ? (lead.wonAt ?? new Date()) : null,
    },
  });
  done(`/w/${slug}/leads`, `${lead.name} updated.`);
}

export async function deleteLead(slug: string, leadId: string) {
  const { workspace } = await requireWorkspaceEditor(slug);
  await db.lead.deleteMany({ where: { id: leadId, workspaceId: workspace.id } });
  done(`/w/${slug}/leads`, "Lead removed.");
}

// ---------- Content studio ----------

export async function createContent(slug: string, form: FormData) {
  const { workspace } = await requireWorkspaceEditor(slug);
  const path = `/w/${slug}/content`;
  const brief = str(form, "brief");
  if (!brief) fail(path, "Write a short brief first.");
  const count = Math.min(5, Math.max(1, Number(str(form, "count")) || 1));
  const channel = str(form, "channel") || "instagram";
  const format = str(form, "format") || "post";
  let pieces;
  try {
    pieces = await generateContent(workspace, { channel, format, brief, count });
  } catch (err) {
    fail(path, errorText(err));
  }
  await db.contentItem.createMany({
    data: pieces.map((p) => ({ workspaceId: workspace.id, channel, format, brief, title: p.title, body: p.body })),
  });
  done(path, `${pieces.length} draft(s) ready for review.`);
}

export async function updateContent(slug: string, itemId: string, form: FormData) {
  const { workspace } = await requireWorkspaceEditor(slug);
  const status = str(form, "status");
  await db.contentItem.updateMany({
    where: { id: itemId, workspaceId: workspace.id },
    data: {
      body: str(form, "body") || undefined,
      status: ["DRAFT", "APPROVED", "PUBLISHED"].includes(status) ? status : undefined,
    },
  });
  done(`/w/${slug}/content`, "Saved.");
}

export async function deleteContent(slug: string, itemId: string) {
  const { workspace } = await requireWorkspaceEditor(slug);
  await db.contentItem.deleteMany({ where: { id: itemId, workspaceId: workspace.id } });
  done(`/w/${slug}/content`, "Deleted.");
}

// ---------- Chatbots ----------

export async function createChatbot(slug: string, form: FormData) {
  const { workspace } = await requireWorkspaceEditor(slug);
  const path = `/w/${slug}/chatbots`;
  const count = await db.chatbot.count({ where: { workspaceId: workspace.id } });
  if (count >= (CHATBOT_LIMITS[workspace.plan] ?? 1)) {
    fail(path, "This plan's chatbot limit is reached. Upgrade under Billing to add more.");
  }
  const bot = await db.chatbot.create({
    data: { workspaceId: workspace.id, name: str(form, "name") || `${workspace.name} Assistant` },
  });
  done(`${path}/${bot.id}`, "Chatbot created. Add its knowledge, then copy the embed code.");
}

export async function saveChatbot(slug: string, botId: string, form: FormData) {
  const { workspace } = await requireWorkspaceEditor(slug);
  await db.chatbot.updateMany({
    where: { id: botId, workspaceId: workspace.id },
    data: {
      name: str(form, "name"),
      welcome: str(form, "welcome"),
      instructions: str(form, "instructions"),
      knowledge: str(form, "knowledge"),
      active: form.get("active") === "on",
    },
  });
  done(`/w/${slug}/chatbots/${botId}`, "Chatbot saved.");
}

export async function deleteChatbot(slug: string, botId: string) {
  const { workspace } = await requireWorkspaceEditor(slug);
  await db.chatbot.deleteMany({ where: { id: botId, workspaceId: workspace.id } });
  done(`/w/${slug}/chatbots`, "Chatbot deleted.");
}

// ---------- Reports ----------

export async function generateReport(slug: string, form: FormData) {
  const { workspace } = await requireWorkspaceEditor(slug);
  const path = `/w/${slug}/reports`;
  const month = str(form, "month");
  if (!/^\d{4}-\d{2}$/.test(month)) fail(path, "Choose a month.");
  let report;
  try {
    report = await buildReport(workspace, month);
  } catch (err) {
    fail(path, errorText(err));
  }
  done(`${path}/${report.month}`, "Report ready.");
}
