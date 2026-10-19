import Link from "next/link";
import { desc } from "drizzle-orm";
import { connection } from "next/server";
import { clients, db } from "@/db";
import { createClient, logout } from "@/app/actions";
import { ActionForm, Field } from "@/components/action-form";

export default async function Home() {
  await connection();
  const all = await db.select().from(clients).orderBy(desc(clients.createdAt));

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-8">
      <header className="mb-10 flex items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <h1 className="text-5xl">Katungo</h1>
          <p className="label mt-2">Story-to-Scale · client systems</p>
        </div>
        <form action={logout}>
          <button className="btn-quiet">Sign out</button>
        </form>
      </header>

      <div className="grid gap-10 md:grid-cols-[1fr_340px]">
        <section>
          <h2 className="mb-4 text-2xl">Clients</h2>
          {all.length === 0 ? (
            <p className="text-muted">No clients yet. Add the first one to begin with its brand profile.</p>
          ) : (
            <ul className="flex flex-col border-t border-line">
              {all.map((c) => (
                <li key={c.id} className="border-b border-line">
                  <Link href={`/clients/${c.id}`} className="flex items-baseline justify-between gap-4 py-4 hover:text-teal">
                    <span className="text-lg font-semibold">{c.name}</span>
                    <span className="text-sm text-muted">{c.sector ?? c.website ?? ""}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card h-fit">
          <h2 className="mb-4 text-2xl">New client</h2>
          <ActionForm action={createClient} submitLabel="Add client" pendingLabel="Adding…">
            <Field label="Name">
              <input className="field" name="name" required />
            </Field>
            <Field label="Website">
              <input className="field" name="website" type="url" placeholder="https://" />
            </Field>
            <Field label="Sector">
              <input className="field" name="sector" placeholder="e.g. stock feed manufacturing" />
            </Field>
            <Field label="Notes" hint="What you know from the first conversation: customers, offers, goals.">
              <textarea className="field min-h-28" name="notes" />
            </Field>
          </ActionForm>
        </section>
      </div>
    </main>
  );
}
