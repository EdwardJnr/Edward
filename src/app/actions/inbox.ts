"use server";

import { db } from "@/lib/db";
import { requireWorkspaceEditor } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { done, errorText, fail, str } from "@/lib/flash";
import { sendReply, syncMailbox, testMailbox } from "@/lib/email";

export async function saveMailbox(slug: string, form: FormData) {
  const { workspace } = await requireWorkspaceEditor(slug);
  const path = `/w/${slug}/inbox`;
  const existing = await db.mailbox.findUnique({ where: { workspaceId: workspace.id } });
  const password = str(form, "password");
  if (!existing && !password) fail(path, "Enter the mailbox password.");

  const data = {
    imapHost: str(form, "imapHost"),
    imapPort: Number(str(form, "imapPort")) || 993,
    smtpHost: str(form, "smtpHost"),
    smtpPort: Number(str(form, "smtpPort")) || 465,
    username: str(form, "username"),
    fromName: str(form, "fromName"),
    autoSend: form.get("autoSend") === "on",
    ...(password ? { passwordEnc: encrypt(password) } : {}),
  };
  if (!data.imapHost || !data.smtpHost || !data.username) fail(path, "Server names and username are required.");

  const mailbox = existing
    ? await db.mailbox.update({ where: { id: existing.id }, data })
    : await db.mailbox.create({ data: { ...data, passwordEnc: data.passwordEnc!, workspaceId: workspace.id } });

  try {
    await testMailbox(mailbox);
  } catch (err) {
    fail(path, `Saved, but the connection failed: ${errorText(err)}`);
  }
  done(path, "Mailbox connected.");
}

export async function syncNow(slug: string) {
  const { workspace } = await requireWorkspaceEditor(slug);
  const path = `/w/${slug}/inbox`;
  const mailbox = await db.mailbox.findUnique({ where: { workspaceId: workspace.id }, include: { workspace: true } });
  if (!mailbox) fail(path, "Connect a mailbox first.");
  let result;
  try {
    result = await syncMailbox(mailbox);
  } catch (err) {
    fail(path, `Sync failed: ${errorText(err)}`);
  }
  done(path, result.fetched ? `${result.fetched} new email(s) read and sorted.` : "No new email.");
}

export async function sendDraft(slug: string, emailId: string, form: FormData) {
  const { workspace } = await requireWorkspaceEditor(slug);
  const path = `/w/${slug}/inbox`;
  const [mailbox, email] = await Promise.all([
    db.mailbox.findUnique({ where: { workspaceId: workspace.id } }),
    db.emailMessage.findFirst({ where: { id: emailId, workspaceId: workspace.id } }),
  ]);
  if (!mailbox || !email) fail(path, "That email or mailbox no longer exists.");
  const body = str(form, "body");
  if (!body) fail(path, "The reply is empty.");
  try {
    await sendReply(mailbox, email, body);
  } catch (err) {
    fail(path, `Not sent: ${errorText(err)}`);
  }
  done(path, `Reply sent to ${email.fromAddr}.`);
}

export async function saveDraft(slug: string, emailId: string, form: FormData) {
  const { workspace } = await requireWorkspaceEditor(slug);
  await db.emailMessage.updateMany({
    where: { id: emailId, workspaceId: workspace.id },
    data: { draftReply: str(form, "body"), status: "DRAFTED" },
  });
  done(`/w/${slug}/inbox`, "Draft saved.");
}

export async function ignoreEmail(slug: string, emailId: string) {
  const { workspace } = await requireWorkspaceEditor(slug);
  await db.emailMessage.updateMany({ where: { id: emailId, workspaceId: workspace.id }, data: { status: "IGNORED" } });
  done(`/w/${slug}/inbox`, "Marked as dealt with.");
}
