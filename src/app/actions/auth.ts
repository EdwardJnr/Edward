"use server";

import { redirect } from "next/navigation";
import { endSession, startSession, verifyLogin } from "@/lib/auth";
import { fail, str } from "@/lib/flash";

export async function login(form: FormData) {
  const user = await verifyLogin(str(form, "email"), str(form, "password"));
  if (!user) fail("/login", "That email and password do not match.");
  await startSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await endSession();
  redirect("/login");
}
