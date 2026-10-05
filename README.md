# Katungo Engine

The Story-to-Scale Method as software. Katungo runs each client's account; clients sign in to see their leads, content and reports.

| Area | What it does | Method stage |
|---|---|---|
| Brand profile | Customers, promise, proof, offers and voice. Every AI feature writes from it. | 1–2 |
| Content studio | Drafts posts, captions, ads, scripts and newsletters in the brand voice. Nothing is published until approved. | 3 |
| Leads | One pipeline for website forms, chatbots, email, WhatsApp and walk-ins, tracked from enquiry to sale. | 4 |
| Inbox | Reads a mailbox, files enquiries as leads and drafts replies. A person approves each send unless auto-send is switched on. | 4 |
| Chatbots | Website assistants that answer from the profile and knowledge, then capture interested visitors as leads. | 4 |
| Reports | Monthly enquiries, sales, revenue and repeat customers, with a written summary and next steps. | 5 |
| Billing | Monthly plans paid through Paynow: EcoCash, OneMoney or card. | — |

**Roles.** Admin and staff see and edit every business. Client accounts see only their own business, can view everything, and can pay for their plan. Only admins manage accounts.

## Run it locally

Requires Node 20 or later.

```bash
npm install
cp .env.example .env        # then fill in the values
npx prisma db push          # creates the database
npm run db:seed             # creates your admin account and a demo business
npm run dev                 # http://localhost:3000
```

The app runs without an `ANTHROPIC_API_KEY`, with the AI features switched off. Without Paynow keys, billing is switched off in the same way.

## Checks

```bash
npm run lint    # type check
npm test        # unit tests: metrics, Paynow hashing, encryption
npm run build
```

## Going live

1. **Database.** In `prisma/schema.prisma`, change `provider = "sqlite"` to `"postgresql"`. Set `DATABASE_URL` to a Postgres database (Neon, Supabase or Railway), then run `npx prisma db push`.
2. **Hosting.** Vercel is the simplest option. Import the repository and add every variable from `.env.example`. Set `APP_URL` to the live address.
3. **Scheduled jobs.** `vercel.json` checks email every 15 minutes and writes reports at 06:00 UTC on the first of each month. Vercel sends `CRON_SECRET` automatically. Checking every 15 minutes needs a Vercel Pro plan; on the free plan, set it to once a day or call the endpoint from any scheduler with `Authorization: Bearer <CRON_SECRET>`.
4. **Paynow.** In the Paynow dashboard, create an integration and copy the ID and key. Paynow posts payment results to `APP_URL/api/paynow/result`, which must be publicly reachable. Test-mode mobile payments only work from the `PAYNOW_AUTH_EMAIL` account.
5. **Claude.** Create an API key at console.anthropic.com and set `ANTHROPIC_API_KEY`. The app uses `claude-opus-5-5`, and requests that Claude declines are retried on Anthropic's recommended fallback model.

## Embedding on a client's website

- **Chatbot.** Paste the one-line script from the chatbot's page before the closing `</body>` tag.
- **Enquiry form.** Point any form at the address shown on the Leads page. It accepts the fields `name`, `email`, `phone` and `message`. A hidden field named `_gotcha` traps spam bots.

## Layout

```
prisma/schema.prisma     data model
src/lib/ai.ts            every Claude call: content, email triage, chatbot, reports
src/lib/email.ts         IMAP reading, SMTP sending
src/lib/paynow.ts        Paynow web and mobile checkout, hash verification
src/lib/metrics.ts       monthly numbers
src/app/(app)/           signed-in screens
src/app/api/public/      chatbot and enquiry-form endpoints for client websites
src/app/api/cron/        scheduled email sync and monthly reports
```

## Not built yet

- A WhatsApp Business API connection. WhatsApp leads are entered by hand for now.
- Direct publishing to Instagram, Facebook and LinkedIn. Approved content is copied across by hand.
- Automatic monthly renewal. Paynow has no card subscriptions, so clients pay each month from the Billing page.
- Password reset. For now an admin removes the account and creates it again.
