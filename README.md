# Fuguaa

Online marketplace for handwoven smocks. Next.js 14 (App Router), TypeScript, Tailwind, Prisma + PostgreSQL, NextAuth, Paystack, Resend (email), Arkesel (SMS).

## What is in it

| Who | What they can do |
| --- | --- |
| Buyer | Sign up, browse and filter, cart, pay with Paystack (MoMo or card), track orders, confirm receipt, report an issue (72h window) |
| Seller | Sign up, submit Ghana Card / passport + photo, get approved, list and edit products, mark orders shipped, see held vs released money |
| Admin | Approve/reject sellers, view ID photo, edit/hide/delete any listing, resolve disputes, platform metrics. Admins also have every seller power (a verified "Fuguaa Official" shop is created for them) |

All photos are uploaded from the user's device. Product photos go to Vercel Blob. **ID photos are never public**: they are encrypted (AES-256-GCM) in the database and only the admin route can decrypt them.

Seller and admin get an **email and SMS** when someone pays for an order. The buyer gets a confirmation email, and shipped/dispute updates.

## Run locally

```bash
npm install
cp .env.example .env        # fill it in (see below)
npx prisma migrate dev --name init   # or: npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000. Admin login is `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env`. Local product uploads go to `public/uploads` when no Blob token is set.

Sample sellers from the seed use password `Seller12345`. **Delete them before launch.** Seeded products use placeholder art; to edit one, remove its placeholder photo and upload a real one.

## Environment variables

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Neon or Supabase Postgres connection string |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL` | Your live URL, e.g. `https://fuguaa.com` (used for SEO, sitemap, Paystack callback) |
| `ENCRYPTION_KEY` | `openssl rand -hex 32`. **Back this up. Lose it and stored IDs cannot be read.** |
| `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack dashboard > Settings > API keys. Use test keys first |
| `BLOB_READ_WRITE_TOKEN` | Vercel project > Storage > Create Blob store |
| `RESEND_API_KEY`, `EMAIL_FROM` | resend.com. Verify your domain so mail does not land in spam |
| `ARKESEL_API_KEY`, `SMS_SENDER_ID` | sms.arkesel.com. Sender ID is max 11 characters and may need approval |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_PHONE` | Admin account for the seed, and where admin alerts are sent |

## Push to GitHub and deploy on Vercel

```bash
git init && git add . && git commit -m "Fuguaa v1"
git branch -M main
git remote add origin https://github.com/YOUR_USER/fuguaa.git
git push -u origin main
```

1. On vercel.com choose **Add New > Project** and import the repo.
2. Add every environment variable above (set `NEXT_PUBLIC_SITE_URL`/`NEXTAUTH_URL` to your domain).
3. Create the Blob store under **Storage** and connect it to the project.
4. Create the tables once from your computer with the production `DATABASE_URL`: `npx prisma migrate deploy` (or `npx prisma db push`), then `npm run db:seed` to create the admin.
5. Deploy. In Paystack > Settings > API & Webhooks set the webhook URL to `https://YOUR_DOMAIN/api/paystack/webhook`.
6. Add your custom domain in Vercel > Settings > Domains.

## SEO

Built in: page titles and descriptions, Open Graph, canonical URLs, `sitemap.xml`, `robots.txt`, and JSON-LD (Organization, WebSite, Product with price and stock). To rank for "Fuguaa" and "smocks":

1. Use a custom domain (ideally fuguaa.com) and set `NEXT_PUBLIC_SITE_URL` to it.
2. Add the site to **Google Search Console**, paste the verification token in `app/layout.tsx` (`verification.google`), and submit `/sitemap.xml`.
3. Create a Google Business Profile and link to the site from Instagram, Facebook and WhatsApp.
4. Add real photos and descriptive titles to every listing. Nobody can guarantee a first-place ranking, but the brand-name search is usually won quickly once the site is indexed.

## Money flow (simplified for the MVP)

Payment is captured by Paystack at checkout and the order is marked `escrowStatus: HELD`. When the buyer taps "I received this" it becomes `RELEASED`; an admin refund sets `REFUNDED`. **The app tracks these statuses but does not move money.** Pay sellers out, and send refunds, from the Paystack dashboard (or add Paystack Transfers / Split payments later).

## Security notes

Passwords are bcrypt hashed. ID numbers and photos are AES-256-GCM encrypted. Card and MoMo details never touch this app (Paystack hosted page). Webhooks are HMAC verified, prices are always read from the database, uploads are checked by file signature, and auth/signup/upload/checkout are rate limited. The limiter is in-memory, so for production traffic swap `lib/rate-limit.ts` for Upstash Ratelimit. Before launch run through the OWASP checklist, set strong admin credentials, and review the Ghana Data Protection Act requirements for storing ID data.

## Not built yet

Admin editing of seller profiles, admin management of buyer accounts, bulk approvals, audit log, reviews, favourites, password reset, NIA Ghana Card API check. (Rejected sellers can resubmit from `/seller-onboarding`.)

## Project map

`app/` pages and API routes · `components/` UI · `lib/` auth, crypto, payments, notifications, orders · `prisma/` schema and seed
