import { headers } from "next/headers";
import { updateClient } from "@/app/actions";
import { getClient } from "@/lib/data";
import { ActionForm, Field } from "@/components/action-form";

export default async function SettingsPage(props: PageProps<"/clients/[id]/settings">) {
  const { id } = await props.params;
  const client = await getClient(id);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const endpoint = `${origin}/api/leads/${client.id}`;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="card">
        <h2 className="mb-4 text-2xl">Client details</h2>
        <ActionForm action={updateClient.bind(null, id)} submitLabel="Save">
          <Field label="Name">
            <input className="field" name="name" defaultValue={client.name} required />
          </Field>
          <Field label="Website">
            <input className="field" name="website" type="url" defaultValue={client.website ?? ""} />
          </Field>
          <Field label="Sector">
            <input className="field" name="sector" defaultValue={client.sector ?? ""} />
          </Field>
          <Field label="Notes" hint="Used when building the brand profile. Add what the website does not say.">
            <textarea className="field min-h-40" name="notes" defaultValue={client.notes ?? ""} />
          </Field>
        </ActionForm>
      </section>

      <section className="card h-fit">
        <h2 className="text-2xl">Lead address</h2>
        <p className="mt-2 text-sm text-muted">
          Website forms, a WhatsApp bot or Zapier can post enquiries straight into the lead tracker. Keep the token private.
        </p>
        <div className="mt-4 flex flex-col gap-3 text-sm">
          <Field label="Endpoint">
            <input className="field font-mono text-xs" readOnly value={endpoint} />
          </Field>
          <Field label="Token">
            <input className="field font-mono text-xs" readOnly value={client.leadToken} />
          </Field>
          <pre className="overflow-x-auto bg-sunk p-3 text-xs">{`curl -X POST ${endpoint} \\
  -H "Authorization: Bearer ${client.leadToken}" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Tendai M.","contact":"+263...","source":"WhatsApp","notes":"Asked about bulk pricing"}'`}</pre>
        </div>
      </section>
    </div>
  );
}
