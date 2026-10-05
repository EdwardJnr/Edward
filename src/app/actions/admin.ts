"use server";

import { db } from "@/lib/db";
import { hashPassword, requireTeam, requireUser } from "@/lib/auth";
import { randomToken } from "@/lib/crypto";
import { slugify } from "@/lib/slug";
import { done, fail, str } from "@/lib/flash";
import { notFound } from "next/navigation";

export async function createWorkspace(form: FormData) {
  await requireTeam();
  const name = str(form, "name");
  if (!name) fail("/dashboard", "Give the business a name.");
  let slug = slugify(name);
  if (await db.workspace.findUnique({ where: { slug } })) slug = `${slug}-${randomToken(3).toLowerCase()}`;
  await db.workspace.create({
    data: { name, slug, publicKey: randomToken(16), industry: str(form, "industry") },
  });
  done(`/w/${slug}/brand`, "Business added. Start with its brand profile.");
}

async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") notFound();
  return user;
}

export async function createUser(form: FormData) {
  await requireAdmin();
  const email = str(form, "email").toLowerCase();
  const password = str(form, "password");
  const role = str(form, "role");
  if (!email || !str(form, "name")) fail("/team", "Name and email are required.");
  if (password.length < 10) fail("/team", "Passwords must be at least 10 characters.");
  if (!["ADMIN", "STAFF", "CLIENT"].includes(role)) fail("/team", "Choose a role.");
  if (await db.user.findUnique({ where: { email } })) fail("/team", "Someone already uses that email.");
  const user = await db.user.create({
    data: { email, name: str(form, "name"), role, passwordHash: await hashPassword(password) },
  });
  const workspaceId = str(form, "workspaceId");
  if (role === "CLIENT" && workspaceId) {
    await db.membership.create({ data: { userId: user.id, workspaceId } });
  }
  done("/team", `${user.name} can now sign in.`);
}

export async function grantAccess(form: FormData) {
  await requireAdmin();
  const userId = str(form, "userId");
  const workspaceId = str(form, "workspaceId");
  await db.membership.upsert({
    where: { userId_workspaceId: { userId, workspaceId } },
    create: { userId, workspaceId },
    update: {},
  });
  done("/team", "Access granted.");
}

export async function revokeAccess(form: FormData) {
  await requireAdmin();
  await db.membership.deleteMany({ where: { userId: str(form, "userId"), workspaceId: str(form, "workspaceId") } });
  done("/team", "Access removed.");
}

export async function deleteUser(form: FormData) {
  const me = await requireAdmin();
  const id = str(form, "userId");
  if (id === me.id) fail("/team", "You cannot remove your own account.");
  await db.user.delete({ where: { id } });
  done("/team", "Account removed.");
}
