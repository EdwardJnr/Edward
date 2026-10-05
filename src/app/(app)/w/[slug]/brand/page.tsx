import { requireWorkspace } from "@/lib/auth";
import { saveBrand } from "@/app/actions/workspace";
import { Flash } from "@/components/flash";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string>> };

const FIELDS = [
  ["audience", "1 · The right customers", "Who buys, which of them make the business money, and why they buy."],
  ["promise", "2 · The reason to choose", "The promise in one or two sentences. Why this business and not the one down the road."],
  ["proof", "Proof", "Results, testimonials, numbers, awards, well-known clients. Only real ones."],
  ["offers", "Offers and prices", "What is sold, packages, prices, opening hours, delivery areas."],
  ["voice", "Voice", "How the brand sounds. Words to use, words to avoid, languages (English, Shona, Ndebele)."],
] as const;

export default async function BrandPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { workspace, canEdit } = await requireWorkspace(slug);
  const save = saveBrand.bind(null, slug);
  return (
    <>
      <div className="head">
        <div>
          <h1>Brand profile</h1>
          <p>Stages one and two of the Story-to-Scale Method. Content, email replies, chatbots and reports all write from this page, so it is worth getting right.</p>
        </div>
      </div>
      <Flash params={sp} />
      <form action={save} className="card">
        <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0 }}>
          <div className="grid g3">
            <div>
              <label htmlFor="name">Business name</label>
              <input id="name" name="name" defaultValue={workspace.name} />
            </div>
            <div>
              <label htmlFor="industry">Industry</label>
              <input id="industry" name="industry" defaultValue={workspace.industry} />
            </div>
            <div>
              <label htmlFor="website">Website</label>
              <input id="website" name="website" defaultValue={workspace.website} />
            </div>
          </div>
          {FIELDS.map(([key, label, hint]) => (
            <div key={key}>
              <label htmlFor={key}>
                {label} <span className="muted">· {hint}</span>
              </label>
              <textarea id={key} name={key} defaultValue={workspace[key]} />
            </div>
          ))}
          {canEdit && (
            <div style={{ marginTop: 14 }}>
              <button className="btn">Save profile</button>
            </div>
          )}
        </fieldset>
      </form>
    </>
  );
}
