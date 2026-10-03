# Fuguaa

Online marketplace for handwoven smocks. Next.js 14 (App Router), TypeScript, Tailwind, Prisma + PostgreSQL, NextAuth, Paystack, Resend (email), Arkesel (SMS).

## Features

| Who | What they can do |
| --- | --- |
| Buyer | Sign up, browse and filter, cart, pay with Paystack (MoMo or card), track orders, confirm receipt, report an issue (72h window), review delivered orders (verified purchases only), reset password |
| Seller | Sign up, submit Ghana Card / passport + photo, get approved, list and edit products, mark orders shipped, see held vs released money, get email + SMS on each order |
| Admin | Verification queue (with ID photo), listing moderation (edit / hide / delete), seller management (edit profile, suspend), buyer management (search, suspend), disputes, audit log, metrics. Also has every seller power (a verified "Fuguaa Official" shop is created for admins) |

All photos are uploaded from the user's device (large phone photos are shrunk in the browser first). Product photos go to Vercel Blob. **ID photos are never public**: they are encrypted (AES-256-GCM) in the database and only the admin route can decrypt them, and every view is written to the audit log.

## Deploying to Vercel: do these in order

The #1 cause of "Application error: a server-side exception has occurred" is a missing setting or missing database tables. Work through this list, then open **`https://YOUR-SITE/api/health`**. It tells you exactly what is missing (it never shows secret values).

1. **Create a Postgres database** (Neon or Supabase) and copy its connection string (it must end with `?sslmode=require`).
2. **Push the code to GitHub**, then in Vercel choose *Add New > Project* and import it.
3. **Add environment variables** in Vercel *Settings > Environment Variables* (then redeploy). Required: `DATABASE_URL`, `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`, `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL`. See the table below.
4. **Create the database tables** (once, from your own computer, using the production `DATABASE_URL`):
   ```bash
   npm install
   DATABASE_URL="your-production-url" npx prisma db push
   DATABASE_URL="your-production-url" ENCRYPTION_KEY="..." ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="a-strong-password" npm run db:seed
   ```
   (Windows PowerShell: set each variable with `$env:NAME="value"` first.) Skip the sample sellers if you do not want them: log in as admin and suspend or delete them.
5. **Storage:** in Vercel *Storage*, create a **Blob** store and connect it to the project (adds `BLOB_READ_WRITE_TOKEN`). Without it, product photo uploads fail on Vercel.
6. **Redeploy**, open `/api/health`, and fix anything it lists.
7. **Paystack webhook:** Paystack dashboard > Settings > API & Webhooks > set `https://YOUR_DOMAIN/api/paystack/webhook`.
8. **Custom domain:** Vercel > Settings > Domains. Update `NEXT_PUBLIC_SITE_URL` (and `NEXTAUTH_URL`) to it and redeploy.

## Environment variables

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Neon or Supabase connection string, with `?sslmode=require` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32`. **Required in production or login breaks** |
| `NEXT_PUBLIC_SITE_URL` | Your live URL, e.g. `https://fuguaa.com` (SEO, sitemap, Paystack callback, email links) |
| `NEXTAUTH_URL` | Same URL. Optional on Vercel, recommended with a custom domain |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` (exactly 64 hex characters). **Back this up. Lose it and stored IDs cannot be read** |
| `PAYSTACK_SECRET_KEY` | Paystack dashboard > Settings > API keys. Start with test keys |
| `BLOB_READ_WRITE_TOKEN` | Added automatically when you connect a Vercel Blob store |
| `RESEND_API_KEY`, `EMAIL_FROM` | resend.com. Verify your domain so mail does not land in spam |
| `ARKESEL_API_KEY`, `SMS_SENDER_ID` | sms.arkesel.com. Sender ID max 11 characters, may need approval |
| `ADMIN_EMAIL`, `ADMIN_PHONE` | Admin account for the seed, and where admin email/SMS alerts go |
| `ADMIN_PASSWORD` | Only needed when running the seed |
| `CRON_SECRET` | `openssl rand -hex 16`. Protects the daily job that auto-releases payments for orders shipped over 14 days ago with no dispute |

If email or SMS keys are missing, orders still work: the message is skipped and a warning is written to the Vercel logs.

## Run locally

```bash
npm install
cp .env.example .env          # fill it in
npx prisma migrate dev --name init   # creates prisma/migrations. Commit that folder
npm run db:seed
npm run dev
```

Then production can use `npm run db:deploy` (applies the committed migrations) instead of `db push`.

## Quality checks

```bash
npm run lint        # next lint
npm run typecheck   # tsc --noEmit
npm test            # unit tests (crypto, permissions, payments signature, uploads, escaping, schema)
npm run build
```

`.github/workflows/ci.yml` runs all four on every push once the repo is on GitHub.

## SEO

Built in: page titles and descriptions, Open Graph, per-page canonical URLs, `sitemap.xml`, `robots.txt`, and JSON-LD (Organization, WebSite, Product with price, stock and ratings). Filtered/search shop pages are kept out of Google; occasion pages are indexed. To rank for "Fuguaa" and "smocks":

1. Use a custom domain (ideally fuguaa.com) and set `NEXT_PUBLIC_SITE_URL` to it.
2. Add the site to **Google Search Console**, paste its verification token into `app/layout.tsx` (`verification.google`), and submit `/sitemap.xml`.
3. Create a Google Business Profile and link to the site from Instagram, Facebook and WhatsApp.
4. Use real photos and descriptive titles on every listing. Nobody can guarantee first place; the brand-name search is usually won quickly once the site is indexed.

## Money flow (simplified for the MVP)

Paystack captures payment at checkout and the order is marked `HELD`. When the buyer taps "I received this" (or 14 days pass after shipping with no dispute) it becomes `RELEASED`. An admin refund sets `REFUNDED`. **The app tracks these statuses but does not move money.** Pay sellers out, and send refunds, from the Paystack dashboard (or add Paystack Transfers / Split payments later).

If an item sells out in the seconds between checkout and payment, the order is automatically opened as a dispute titled "Refund the buyer" and the seller is not asked to ship it.

## Security notes

- Passwords: bcrypt. Reset links: single use, 1 hour, stored hashed.
- ID numbers and photos: AES-256-GCM. The same ID cannot be registered on two shops.
- Card and MoMo details never touch this app (Paystack hosted page). Webhooks are HMAC verified, and the paid amount must match the order total.
- Roles are re-read from the database on every request, so suspending a user takes effect immediately.
- Prices and stock always come from the database. Uploads are checked by file signature (SVG/HTML are rejected). Seller-supplied text is escaped in emails and JSON-LD.
- Cross-site POSTs are rejected (origin check in `middleware.ts`); auth, signup, upload, checkout, review and reset endpoints are rate limited.
- The rate limiter is in-memory, so each serverless instance has its own counter. For real traffic swap `lib/rate-limit.ts` for Upstash Ratelimit.
- Not done: email verification at signup, a Content-Security-Policy header, 2FA for admins, NIA Ghana Card API check, and a review of the Ghana Data Protection Act requirements for storing ID data. Do these before heavy launch.

## Not built

Bulk approvals (deliberately omitted: each ID should be looked at), review moderation by admin, favourites, automatic payouts/refunds.

## Project map

`app/` pages and API routes · `components/` UI · `lib/` auth, crypto, payments, notifications, orders, permissions · `prisma/` schema and seed · `tests/` unit tests
