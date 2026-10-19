# Katungo Studio

The dashboard behind the Story-to-Scale Method. Each client gets one workspace, organised by stage:

| Stage | Page | What it does |
|---|---|---|
| 01–02 Find the right customers · sharpen the reason to choose | **Profile** | Reads the client's website and your notes, then writes a brand profile with Claude: promise, proof, voice, ranked customer segments, offers, competitor watch and questions to confirm with the client. |
| 03–04 Capture the proof · build the system | **Calendar** | Plans a month of posts against the profile (channel, segment, caption, visual brief, call to action). Posts arrive as ideas and move through Approved → Scheduled → Published. |
| 04 Track every lead to a sale | **Leads** | A simple pipeline: New → Contacted → Qualified → Won or Lost, with sale value and returning-customer flag. Website forms, a WhatsApp bot or Zapier can post enquiries in through each client's lead address. |
| 05 Convert and keep | **Report** | The four monthly numbers (enquiries, cost per enquiry, sales from tracked leads and repeat customers), each against last month, plus Claude-written commentary. |

The overview page shows this month's numbers and where each stage stands.

## Running it locally

You need Node 20.9 or later and a Postgres database (15 or later).

```bash
npm install
cp .env.example .env.local      # then fill in the four values
npm run db:migrate              # creates the tables
npm run dev                     # http://localhost:3000
```

Sign in with the `APP_PASSWORD` you set.

## Deploying (Supabase and Vercel)

1. Create a Supabase project. Under Project Settings → Database, copy the **Transaction pooler** connection string.
2. Run the migrations against it once: `DATABASE_URL="<that string>" npm run db:migrate`.
3. Import this repository into Vercel and set `DATABASE_URL`, `ANTHROPIC_API_KEY`, `APP_PASSWORD` and `SESSION_SECRET` as environment variables.
4. Deploy. Each client's lead address is shown on its Settings page.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Unit tests for the monthly numbers |
| `npm run typecheck` / `npm run lint` | Type and lint checks |
| `npm run db:generate` | Write a new migration after changing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |

## How it is built

- Next.js 16 (App Router, server actions), Tailwind CSS 4, TypeScript.
- Postgres through Drizzle ORM. `src/db/schema.ts` holds the tables.
- Claude (`claude-opus-5-5`) through the Anthropic SDK, with structured outputs validated by Zod (`src/lib/ai.ts`, `src/lib/schemas.ts`). Server-side fallback is on, so a request a safety classifier declines is retried on a suitable model.
- The monthly numbers are pure functions in `src/lib/metrics.ts`, covered by tests.
- One studio password guards the dashboard (`src/proxy.ts`). The lead address checks a per-client token.

## Not built yet

- Posting directly to Instagram, Facebook or WhatsApp. The calendar tracks status; publishing is still done in each platform or a scheduler.
- The WhatsApp assistant itself. The lead address is ready to receive its enquiries.
- Client logins. Today only the studio team signs in; clients see their numbers through the monthly review.
- A brand strategist chat and an asset library for shoots.
