import { eq } from "drizzle-orm";
import { brandProfiles, db } from "@/db";
import { buildProfile } from "@/app/actions";
import { getClient } from "@/lib/data";
import { ActionForm, Field } from "@/components/action-form";

function List({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default async function ProfilePage(props: PageProps<"/clients/[id]/profile">) {
  const { id } = await props.params;
  const client = await getClient(id);
  const profile = await db.query.brandProfiles.findFirst({ where: eq(brandProfiles.clientId, id) });
  const p = profile?.data;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-8">
        {!p ? (
          <div className="card">
            <h2 className="text-2xl">No profile yet</h2>
            <p className="mt-2 text-muted">
              Build it from the client’s website and your notes. It names the customers who make the business money, why they
              buy, and the promise that makes them choose. Every later stage is written against it.
            </p>
          </div>
        ) : (
          <>
            <section>
              <p className="label">The promise</p>
              <p className="mt-2 font-serif text-3xl leading-tight text-teal">{p.promise}</p>
              <p className="mt-4 text-muted">{p.summary}</p>
            </section>

            <section>
              <h2 className="mb-3 text-2xl">Customer segments</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {p.segments.map((s) => (
                  <div key={s.name} className="card">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-xl">{s.name}</h3>
                      <span className={`label ${s.valueToBusiness === "high" ? "text-teal" : ""}`}>{s.valueToBusiness} value</span>
                    </div>
                    <p className="mt-2 text-sm">{s.description}</p>
                    <p className="mt-2 text-sm">
                      <span className="font-semibold">Why they buy: </span>
                      {s.whyTheyBuy}
                    </p>
                    <p className="label mt-3">{s.channels.join(" · ")}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-6 md:grid-cols-2">
              <div>
                <h2 className="mb-3 text-2xl">Proof</h2>
                <List items={p.proofPoints} />
              </div>
              <div>
                <h2 className="mb-3 text-2xl">Values</h2>
                <List items={p.values} />
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-2xl">Voice</h2>
              <p>{p.voice.description}</p>
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                <div>
                  <p className="label mb-2">Sounds like</p>
                  <List items={p.voice.sayLike} />
                </div>
                <div>
                  <p className="label mb-2">Avoid</p>
                  <List items={p.voice.avoid} />
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-2xl">Offers</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {p.offers.map((o) => (
                  <div key={o.name} className="card">
                    <h3 className="text-xl">{o.name}</h3>
                    <p className="label mt-1">For {o.forSegment}</p>
                    <p className="mt-2 text-sm">{o.description}</p>
                  </div>
                ))}
              </div>
            </section>

            {p.competitors.length > 0 && (
              <section>
                <h2 className="mb-3 text-2xl">Competitor watch</h2>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="label py-2 pr-4 font-normal">Competitor</th>
                      <th className="label py-2 pr-4 font-normal">Their promise</th>
                      <th className="label py-2 font-normal">Where they fall short</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.competitors.map((c) => (
                      <tr key={c.name} className="border-b border-line align-top">
                        <td className="py-3 pr-4 font-semibold">{c.name}</td>
                        <td className="py-3 pr-4">{c.promise}</td>
                        <td className="py-3">{c.weakness}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {p.openQuestions.length > 0 && (
              <section className="border-l-4 border-mint bg-raised p-5">
                <h2 className="mb-2 text-xl">To confirm with the client</h2>
                <List items={p.openQuestions} />
              </section>
            )}
          </>
        )}
      </div>

      <aside className="card h-fit">
        <h2 className="text-xl">{p ? "Rebuild the profile" : "Build the profile"}</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          Reads the website and the notes in Settings. Takes about a minute. Rebuilding replaces the current profile.
        </p>
        <ActionForm
          action={buildProfile.bind(null, id)}
          submitLabel={p ? "Rebuild profile" : "Build profile"}
          pendingLabel="Reading and writing…"
        >
          <Field label="Website">
            <input className="field" name="website" type="url" defaultValue={client.website ?? ""} placeholder="https://" />
          </Field>
        </ActionForm>
        {profile && (
          <p className="mt-4 text-xs text-muted">
            Last built {profile.updatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
      </aside>
    </div>
  );
}
