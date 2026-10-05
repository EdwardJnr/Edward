import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/auth";
import { checkPayment, startPayment } from "@/app/actions/billing";
import { PLANS } from "@/lib/plans";
import { paynowConfigured } from "@/lib/paynow";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string>> };

export default async function BillingPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { workspace } = await requireWorkspace(slug);
  const payments = await db.payment.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "desc" }, take: 20 });
  const returning = sp.ref ? payments.find((p) => p.reference === sp.ref) : undefined;

  return (
    <>
      <div className="head">
        <div>
          <h1>Billing</h1>
          <p>
            {workspace.planStatus === "ACTIVE" && workspace.planRenewsAt
              ? `${workspace.plan.toLowerCase()} plan, paid until ${workspace.planRenewsAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`
              : "No active plan."}{" "}
            Pay by card, EcoCash or OneMoney through Paynow. Prices in US dollars, per month.
          </p>
        </div>
      </div>
      <Flash params={sp} />
      {returning && returning.status !== "PAID" && (
        <div className="flash ok">Thank you. Paynow is confirming the payment; press Check status below if it does not update in a minute.</div>
      )}
      {!paynowConfigured() && <div className="flash err">Paynow is not configured yet. Add the integration ID and key to the environment.</div>}

      <div className="grid g3">
        {Object.entries(PLANS).map(([key, plan]) => (
          <form key={key} action={startPayment.bind(null, slug)} className="card">
            <input type="hidden" name="plan" value={key} />
            <h2>{plan.name}</h2>
            <p>
              <span style={{ fontFamily: "var(--serif)", fontSize: 30, color: "var(--teal)" }}>${plan.price}</span>
              <span className="muted"> / month</span>
            </p>
            <ul className="small" style={{ paddingLeft: 18 }}>
              {plan.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <label htmlFor={`method-${key}`}>Pay with</label>
            <select id={`method-${key}`} name="method" defaultValue="ecocash">
              <option value="ecocash">EcoCash (prompt on your phone)</option>
              <option value="onemoney">OneMoney (prompt on your phone)</option>
              <option value="web">Card or other, on Paynow</option>
            </select>
            <label htmlFor={`phone-${key}`}>Mobile number (EcoCash or OneMoney)</label>
            <input id={`phone-${key}`} name="phone" placeholder="0771234567" />
            <div style={{ marginTop: 12 }}>
              <SubmitButton pending="Contacting Paynow…">
                {workspace.plan === key && workspace.planStatus === "ACTIVE" ? "Pay next month" : `Choose ${plan.name}`}
              </SubmitButton>
            </div>
          </form>
        ))}
      </div>

      <div className="card">
        <h2>Payments</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Reference</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{p.createdAt.toLocaleDateString("en-GB")}</td>
                <td className="small">{p.reference}</td>
                <td>{p.plan.toLowerCase()}</td>
                <td>${p.amount.toFixed(2)}</td>
                <td>{p.method}</td>
                <td>
                  <span className={p.status === "PAID" ? "pill" : "pill grey"}>{p.status.toLowerCase()}</span>
                </td>
                <td>
                  {p.status === "SENT" && (
                    <form action={checkPayment.bind(null, slug, p.id)}>
                      <button className="btn small ghost">Check status</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  No payments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
