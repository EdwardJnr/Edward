import { desc, eq } from "drizzle-orm";
import { brandProfiles, db, leads } from "@/db";
import { addLead, deleteLead, updateLead } from "@/app/actions";
import { getClient } from "@/lib/data";
import { formatDate } from "@/lib/metrics";
import { ActionForm, Field } from "@/components/action-form";
import { ActionButton } from "@/components/action-button";

const STAGES = ["new", "contacted", "qualified", "won", "lost"] as const;
const SOURCES = ["WhatsApp", "Instagram", "Facebook", "LinkedIn", "Website", "Email", "Referral", "Walk-in", "Phone"];

export default async function LeadsPage(props: PageProps<"/clients/[id]/leads">) {
  const { id } = await props.params;
  await getClient(id);
  const [rows, profile] = await Promise.all([
    db.query.leads.findMany({ where: eq(leads.clientId, id), orderBy: [desc(leads.firstContactOn), desc(leads.createdAt)] }),
    db.query.brandProfiles.findFirst({ where: eq(brandProfiles.clientId, id) }),
  ]);
  const segments = profile?.data.segments.map((s) => s.name) ?? [];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-8">
      <section className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-5">
        {STAGES.map((s) => (
          <div key={s} className="bg-raised p-4">
            <p className="label">{s}</p>
            <p className="mt-1 font-serif text-3xl text-teal">{rows.filter((r) => r.stage === s).length}</p>
          </div>
        ))}
      </section>

      <details className="card">
        <summary className="cursor-pointer font-serif text-xl">Log an enquiry</summary>
        <ActionForm action={addLead.bind(null, id)} submitLabel="Add lead" resetOnSuccess className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Name">
              <input className="field" name="name" required />
            </Field>
            <Field label="Contact">
              <input className="field" name="contact" placeholder="Phone or email" />
            </Field>
            <Field label="Source">
              <input className="field" name="source" list="sources" required />
            </Field>
            <Field label="Segment">
              <input className="field" name="segment" list="segments" />
            </Field>
            <Field label="First contact">
              <input className="field" type="date" name="firstContactOn" defaultValue={today} />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" name="isRepeat" /> Returning customer
            </label>
          </div>
          <Field label="Notes">
            <textarea className="field min-h-16" name="notes" />
          </Field>
        </ActionForm>
        <datalist id="sources">
          {SOURCES.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <datalist id="segments">
          {segments.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </details>

      {rows.length === 0 ? (
        <p className="text-muted">
          No leads yet. Log enquiries here, or send them from the website or WhatsApp to the lead address in Settings.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((lead) => (
            <li key={lead.id} className="card grid gap-4 p-4 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <h3 className="text-xl">{lead.name}</h3>
                  <span className="label">
                    {lead.source} · {formatDate(lead.firstContactOn)}
                  </span>
                  {lead.isRepeat && <span className="label text-teal">Returning</span>}
                </div>
                {(lead.contact || lead.segment) && (
                  <p className="mt-1 text-sm text-muted">{[lead.contact, lead.segment].filter(Boolean).join(" · ")}</p>
                )}
                {lead.notes && <p className="mt-2 whitespace-pre-line text-sm">{lead.notes}</p>}
              </div>
              <div className="flex flex-col gap-2">
                <ActionForm
                  action={updateLead.bind(null, id, lead.id)}
                  submitLabel="Update"
                  quiet
                  className="flex flex-wrap items-end gap-2"
                >
                  <Field label="Stage">
                    <select className="field" name="stage" defaultValue={lead.stage}>
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Value US$">
                    <input
                      className="field w-28"
                      name="value"
                      inputMode="decimal"
                      defaultValue={lead.valueCents === null ? "" : (lead.valueCents / 100).toString()}
                    />
                  </Field>
                  <Field label="Closed">
                    <input className="field" type="date" name="closedOn" defaultValue={lead.closedOn ?? ""} />
                  </Field>
                  <label className="flex items-center gap-2 pb-2 text-sm">
                    <input type="checkbox" name="isRepeat" defaultChecked={lead.isRepeat} /> Returning
                  </label>
                </ActionForm>
                <div>
                  <ActionButton action={deleteLead.bind(null, id, lead.id)} confirm={`Delete ${lead.name}?`}>
                    Delete
                  </ActionButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
