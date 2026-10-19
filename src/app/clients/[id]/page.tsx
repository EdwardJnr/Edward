import Link from "next/link";
import { and, eq, gte, lt } from "drizzle-orm";
import { brandProfiles, contentItems, db } from "@/db";
import { getClient } from "@/lib/data";
import { loadMonth } from "@/lib/month-data";
import { currentMonth, formatMonth, monthRange } from "@/lib/metrics";
import { MetricTiles } from "@/components/metric-tiles";

export default async function Overview(props: PageProps<"/clients/[id]">) {
  const { id } = await props.params;
  const client = await getClient(id);
  const month = currentMonth();

  const [profile, posts, { leads, current, previous }] = await Promise.all([
    db.query.brandProfiles.findFirst({ where: eq(brandProfiles.clientId, id) }),
    db.query.contentItems.findMany({
      where: and(
        eq(contentItems.clientId, id),
        gte(contentItems.publishOn, monthRange(month)[0]),
        lt(contentItems.publishOn, monthRange(month)[1]),
      ),
    }),
    loadMonth(id, month),
  ]);
  const openLeads = leads.filter((l) => !["won", "lost"].includes(l.stage)).length;
  const approved = posts.filter((p) => p.status !== "idea").length;

  const stages = [
    {
      n: "01–02",
      title: "Find the right customers · sharpen the reason to choose",
      status: profile
        ? `Profile built · ${profile.data.segments.length} ${profile.data.segments.length === 1 ? "segment" : "segments"}`
        : "No profile yet",
      href: "profile",
      done: !!profile,
    },
    {
      n: "03–04",
      title: "Capture the proof · build the system",
      status: posts.length ? `${posts.length} posts this month · ${approved} approved` : "Nothing planned this month",
      href: "calendar",
      done: posts.length > 0,
    },
    {
      n: "04",
      title: "Track every lead to a sale",
      status: `${openLeads} open ${openLeads === 1 ? "lead" : "leads"}`,
      href: "leads",
      done: leads.length > 0,
    },
    {
      n: "05",
      title: "Convert and keep",
      status: `Monthly review for ${formatMonth(month)}`,
      href: "report",
      done: false,
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="mb-4 text-2xl">{formatMonth(month)} so far</h2>
        <MetricTiles current={current} previous={previous} />
      </section>
      <section>
        <h2 className="mb-4 text-2xl">The method for {client.name}</h2>
        <ol className="border-t border-line">
          {stages.map((s) => (
            <li key={s.n} className="border-b border-line">
              <Link href={`/clients/${id}/${s.href}`} className="flex flex-wrap items-baseline gap-x-6 gap-y-1 py-4 hover:text-teal">
                <span className="label w-14 text-teal">{s.n}</span>
                <span className="flex-1 font-semibold">{s.title}</span>
                <span className={`text-sm ${s.done ? "text-teal" : "text-muted"}`}>{s.status} →</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
