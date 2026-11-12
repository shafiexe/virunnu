# Virunnu

Hall and venue booking for celebrations.

## Quick start

1. Copy env file and fill in your values:
   ```bash
   cp .env.example .env
   ```

2. Start the database:
   ```bash
   docker compose up -d
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Run migrations and seed:
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

5. Start the dev server:
   ```bash
   pnpm dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- **Next.js 16** — App Router, Cache Components enabled
- **Prisma** — ORM with PostgreSQL + PostGIS
- **Razorpay** — Payments (keep in test mode)
- **shadcn/ui** — Components (base-nova)
- **jose** — JWT session cookies
- **Zod** — Validation

## Project layout

```
app/api/           Route handlers (thin — delegate to services/)
  auth/            send-otp, verify-otp, logout
  venues/          list, create, get, hall availability
  bookings/        hold, status, payment order
  webhooks/        razorpay payment confirmation
services/          Business logic (auth, venue, booking, payment)
lib/               Shared utilities (db client, session helpers)
prisma/            Schema and migrations
messages/          i18n strings (en, ml)
components/ui/     shadcn components
```

## Key rules

- All money stored as integer paise (₹1 = 100 paise)
- Payment confirmed only from Razorpay webhook — never from the browser redirect
- Booking hold lasts 15 minutes, auto-released by `releaseExpiredHolds()` in a background job
- Every owner-facing table has `orgId`

## Webhooks (local dev)

Use [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/) or ngrok to receive webhooks locally:

```bash
npx cloudflared tunnel --url http://localhost:3000
```

Set the tunnel URL + `/api/webhooks/razorpay` in your Razorpay test dashboard.

## Session secret

Generate one with:
```bash
openssl rand -base64 32
```

Put the result in `.env` as `SESSION_SECRET`.

## Running it for real (ops notes)

**Browser tests.** With `pnpm dev` running, `pnpm e2e` signs in, creates an order, records a payment, checks team-login limits and the phone contact bar in a real browser. It makes its own throwaway catering account (a reserved `example.com` address, so no welcome email or WhatsApp is sent) and deletes it afterwards. Needs `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `.env`.

**Migrations on Neon.** The app uses the pooled `DATABASE_URL`. For migrations, add `DIRECT_URL` (the non-pooled Neon address) in Vercel; `prisma.config.ts` uses it when present, which avoids the advisory-lock timeout. `PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1` is the fallback if you only have the pooled address.

**Health check.** `GET /api/health` returns 200 `{ok:true}` when the database answers, 503 otherwise. Point an uptime monitor (UptimeRobot, Better Stack, free tiers) at it and have it alert you by email or WhatsApp.

**Error alerts.** Set `ALERT_EMAIL` (needs the SMTP settings) and every server error, every page that crashes in a browser, and every refund Razorpay would not make is emailed to that address (`lib/alert.ts`: the same problem is mailed at most once every ten minutes). A failed refund means a customer's money is held and must be returned by hand in the Razorpay dashboard.

**Uptime monitor (set this up once, outside the app).** The app cannot tell you when it is down, so a free monitor must ask it: in UptimeRobot (or Better Stack), add an HTTPS monitor for `https://<your domain>/api/health` every 5 minutes, add your email (and the phone's push alert) as the contact, and set the keyword `"ok":true` so a 200 with a broken body also counts as down.

**Backups.** Neon keeps point-in-time history (length depends on the plan). Before any risky migration, create a Neon branch from the main branch; it is an instant, restorable copy. Photos still live on local disk, not in the database; they are not covered by Neon backups.

**Daily summary.** Vercel Cron calls `/api/cron/daily-summary` with `CRON_SECRET`. After the first deploy, check Vercel → Project → Cron Jobs → Logs once to confirm it ran and a summary arrived.

**Errors.** Vercel → Logs shows server errors. For alerts when something breaks, add an error tracker such as Sentry (free tier) later.

## Photos

Hall and caterer photos are uploaded from the phone or computer, or added as a link. Either way Virunnu keeps its own copy (a link is downloaded when it is added), so a photo cannot expire or be taken down by another site.

- **Where they live.** If a Vercel Blob store is connected to the project, photos go there and are served from its CDN. Connect it in Vercel → Storage → Create → Blob → Connect Project; Vercel adds `BLOB_READ_WRITE_TOKEN` itself. Without a store, photos are kept in the database (table `StoredImage`, served at `/api/img/<id>`), which needs no set-up.
- **Photos already saved as links.** Run `npx tsx --env-file=.env scripts/import-photo-links.ts` once, against the database you want to fix. It is safe to repeat.
- **Links we cannot copy** (the other site blocks us, or it is not a photo) are still kept as links, and the person is told, as before.

## Before going live: security checklist

- **Payments fail closed.** On a live site, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` must be set (in Razorpay's live mode), and `CRON_SECRET` too. If one is missing the matching feature refuses to work, rather than trusting everyone.
- **The server decides what is paid.** The browser only says which slot and which add-ons; the total, the allowed advance and whether the money really arrived are worked out on the server and checked with Razorpay. Money taken for a booking that cannot be made is refunded automatically (a failed refund is logged as `[refund-failed]` and needs doing by hand in Razorpay).
- **Rate limits** on sign-in (wrong attempts only), password reset, OTP, public enquiries and booking requests, AI search and map look-ups. They are per server instance, so on serverless they slow casual abuse but are not a hard guarantee. For one, put a shared limiter (for example Upstash) or Vercel's firewall in front.
- **Links people paste** (photo links, websites for AI fill) are fetched only after the address is checked to be public, and every redirect is checked again.
- **Run the sweeps** after changes: `pnpm e2e` includes an API access sweep (every endpoint as a visitor and as the other kind of account), a two-account isolation check, a page crawl for errors, and an accessibility scan.
