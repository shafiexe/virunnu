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
