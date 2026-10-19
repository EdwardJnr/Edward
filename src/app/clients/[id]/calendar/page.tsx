import { and, asc, eq, gte, lt } from "drizzle-orm";
import { brandProfiles, contentItems, db, type ContentItem } from "@/db";
import { deleteContent, generatePlan, setContentStatus, updateContent } from "@/app/actions";
import { getClient } from "@/lib/data";
import { currentMonth, formatDate, isMonth, monthRange } from "@/lib/metrics";
import { CHANNELS } from "@/lib/schemas";
import { ActionForm, Field } from "@/components/action-form";
import { ActionButton } from "@/components/action-button";
import { MonthSwitcher } from "@/components/month-switcher";

const COLUMNS = [
  { status: "idea", label: "Ideas", next: "approved", nextLabel: "Approve" },
  { status: "approved", label: "Approved", next: "scheduled", nextLabel: "Mark scheduled" },
  { status: "scheduled", label: "Scheduled", next: "published", nextLabel: "Mark published" },
  { status: "published", label: "Published", next: null, nextLabel: null },
] as const;

function PostCard({ clientId, item }: { clientId: string; item: ContentItem }) {
  const column = COLUMNS.find((c) => c.status === item.status)!;
  const index = COLUMNS.indexOf(column);
  return (
    <article className="card flex flex-col gap-2 p-4">
      <p className="label">
        {formatDate(item.publishOn)} · {item.channel}
      </p>
      <h3 className="text-lg leading-snug">{item.title}</h3>
      {item.segment && <p className="text-xs text-muted">For {item.segment}</p>}
      <p className="whitespace-pre-line text-sm">{item.caption}</p>
      {item.cta && (
        <p className="text-sm">
          <span className="font-semibold">Action: </span>
          {item.cta}
        </p>
      )}
      {item.visualBrief && (
        <p className="border-l-2 border-mint pl-2 text-xs text-muted">
          <span className="font-semibold">{item.proofType ?? "Visual"}: </span>
          {item.visualBrief}
        </p>
      )}
      <details className="text-sm">
        <summary className="cursor-pointer text-muted">Edit</summary>
        <ActionForm action={updateContent.bind(null, clientId, item.id)} submitLabel="Save" quiet className="mt-2 flex flex-col gap-2">
          <Field label="Date">
            <input className="field" type="date" name="publishOn" defaultValue={item.publishOn} />
          </Field>
          <Field label="Caption">
            <textarea className="field min-h-32" name="caption" defaultValue={item.caption} />
          </Field>
          <Field label="Visual brief">
            <textarea className="field min-h-16" name="visualBrief" defaultValue={item.visualBrief ?? ""} />
          </Field>
        </ActionForm>
      </details>
      <div className="mt-1 flex flex-wrap gap-2">
        {index > 0 && (
          <ActionButton action={setContentStatus.bind(null, clientId, item.id, COLUMNS[index - 1].status)}>← Back</ActionButton>
        )}
        {column.next && (
          <ActionButton
            className="btn-quiet border-teal text-teal"
            action={setContentStatus.bind(null, clientId, item.id, column.next)}
          >
            {column.nextLabel} →
          </ActionButton>
        )}
        <ActionButton action={deleteContent.bind(null, clientId, item.id)} confirm="Delete this post?">
          Delete
        </ActionButton>
      </div>
    </article>
  );
}

export default async function CalendarPage(props: PageProps<"/clients/[id]/calendar">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const month = typeof sp.month === "string" && isMonth(sp.month) ? sp.month : currentMonth();
  await getClient(id);

  const [start, end] = monthRange(month);
  const [items, profile] = await Promise.all([
    db.query.contentItems.findMany({
      where: and(eq(contentItems.clientId, id), gte(contentItems.publishOn, start), lt(contentItems.publishOn, end)),
      orderBy: [asc(contentItems.publishOn)],
    }),
    db.query.brandProfiles.findFirst({ where: eq(brandProfiles.clientId, id) }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <MonthSwitcher month={month} basePath={`/clients/${id}/calendar`} />
        <p className="text-sm text-muted">
          {items.length} posts · {items.filter((i) => i.status === "published").length} published
        </p>
      </div>

      <details className="card" open={items.length === 0}>
        <summary className="cursor-pointer text-xl font-serif">Plan this month with AI</summary>
        {!profile ? (
          <p className="mt-3 text-muted">Build the brand profile first. The plan is written against its segments and voice.</p>
        ) : (
          <ActionForm
            action={generatePlan.bind(null, id)}
            submitLabel="Write the plan"
            pendingLabel="Planning the month…"
            className="mt-4 flex flex-col gap-4"
          >
            <input type="hidden" name="month" value={month} />
            <fieldset className="flex flex-col gap-2">
              <legend className="label mb-1">Channels</legend>
              <div className="flex flex-wrap gap-4">
                {CHANNELS.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm capitalize">
                    <input type="checkbox" name="channels" value={c} defaultChecked={["instagram", "facebook", "whatsapp"].includes(c)} />
                    {c}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
              <Field label="Posts per week">
                <input className="field" type="number" name="postsPerWeek" min={1} max={21} defaultValue={4} />
              </Field>
              <Field label="Focus this month" hint="Optional: a launch, a season, an offer to push.">
                <input className="field" name="focus" />
              </Field>
            </div>
            <p className="text-sm text-muted">New posts arrive as ideas. Nothing is published until you approve and schedule it.</p>
          </ActionForm>
        )}
      </details>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const colItems = items.filter((i) => i.status === col.status);
          return (
            <section key={col.status} className="flex flex-col gap-3 bg-sunk p-3">
              <h2 className="label">
                {col.label} · {colItems.length}
              </h2>
              {colItems.map((item) => (
                <PostCard key={item.id} clientId={id} item={item} />
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
