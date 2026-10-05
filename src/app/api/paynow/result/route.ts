import { verifyPaynowHash } from "@/lib/paynow";
import { applyPaynowStatus } from "@/lib/billing";

// Paynow posts status updates here. Only hash-verified updates are applied.
export async function POST(req: Request) {
  const key = process.env.PAYNOW_INTEGRATION_KEY;
  const body = await req.text();
  if (!key || !verifyPaynowHash(body, key)) {
    return new Response("Invalid hash", { status: 400 });
  }
  const fields = new URLSearchParams(body);
  const reference = fields.get("reference");
  if (reference) {
    await applyPaynowStatus(reference, fields.get("status") ?? "", fields.get("paynowreference") ?? "");
  }
  return new Response("OK");
}
