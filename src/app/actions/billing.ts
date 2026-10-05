"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth";
import { randomToken } from "@/lib/crypto";
import { done, errorText, fail, str } from "@/lib/flash";
import { isPlanKey, PLANS } from "@/lib/plans";
import { pollPayment, startMobilePayment, startWebPayment } from "@/lib/paynow";
import { applyPaynowStatus } from "@/lib/billing";

// Clients may pay for their own workspace, so this uses requireWorkspace, not the editor check.
export async function startPayment(slug: string, form: FormData) {
  const { user, workspace } = await requireWorkspace(slug);
  const path = `/w/${slug}/billing`;
  const plan = str(form, "plan");
  const method = str(form, "method");
  if (!isPlanKey(plan)) fail(path, "Choose a plan.");
  if (!["web", "ecocash", "onemoney"].includes(method)) fail(path, "Choose how to pay.");

  const phone = str(form, "phone");
  if (method !== "web" && !/^0?7\d{8}$/.test(phone.replace(/\s+/g, ""))) {
    fail(path, "Enter a mobile number such as 0771234567.");
  }

  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const reference = `KE-${Date.now().toString(36).toUpperCase()}-${randomToken(3).toUpperCase()}`;
  const amount = PLANS[plan].price;
  const payment = await db.payment.create({
    data: { workspaceId: workspace.id, reference, plan, amount, method },
  });

  const request = {
    reference,
    amount,
    description: `${PLANS[plan].name} plan, one month, ${workspace.name}`,
    email: user.email,
    returnUrl: `${appUrl}/w/${slug}/billing?ref=${reference}`,
    resultUrl: `${appUrl}/api/paynow/result`,
  };

  let redirectUrl = "";
  try {
    if (method === "web") {
      const r = await startWebPayment(request);
      await db.payment.update({ where: { id: payment.id }, data: { status: "SENT", pollUrl: r.pollUrl } });
      redirectUrl = r.redirectUrl;
    } else {
      const r = await startMobilePayment({ ...request, phone, method: method as "ecocash" | "onemoney" });
      await db.payment.update({ where: { id: payment.id }, data: { status: "SENT", pollUrl: r.pollUrl } });
    }
  } catch (err) {
    await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    fail(path, errorText(err));
  }
  if (redirectUrl) redirect(redirectUrl);
  done(path, "Check your phone and enter your PIN to approve the payment, then press Check status.");
}

export async function checkPayment(slug: string, paymentId: string) {
  const { workspace } = await requireWorkspace(slug);
  const path = `/w/${slug}/billing`;
  const payment = await db.payment.findFirst({ where: { id: paymentId, workspaceId: workspace.id } });
  if (!payment?.pollUrl) fail(path, "Nothing to check for that payment.");
  let updated;
  try {
    const status = await pollPayment(payment.pollUrl);
    updated = await applyPaynowStatus(payment.reference, status.status ?? "", status.paynowreference ?? "");
  } catch (err) {
    fail(path, errorText(err));
  }
  done(path, updated?.status === "PAID" ? "Payment received. Thank you." : `Status: ${updated?.status ?? "unknown"}.`);
}
