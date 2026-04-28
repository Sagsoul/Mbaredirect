# 🛒 Mbare Direct

**Zimbabwe's Buyer-First Reverse-Auction Marketplace**

Agriculture · Construction · Transport

---

## Overview

Mbare Direct flips traditional market power from Seller to Buyer. Buyers post specific needs; only Verified Sellers can pitch. Trust is maintained through a mandatory **$10 USD/year** subscription and strict manual ID verification.

**Key flows:**
1. **Buyer** posts a request (item, quantity, location, budget)
2. **Verified Sellers** pitch their best price + message
3. **Buyer** shortlists the best pitch → direct communication unlocks
4. Both parties mark **Deal Done** → mutual star ratings update Reliability Score
5. After **365 days**, verified status degrades to *Browser-Only* unless renewed

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Database + Auth | Supabase (PostgreSQL + Row Level Security) |
| Storage | Supabase Storage (private `verifications` bucket) |
| Styling | Tailwind CSS (mobile-first, system fonts, no Google Fonts) |
| Deployment | Vercel |
| Payments | EcoCash (manual reconciliation) |

---

## Local Setup

### Prerequisites
- Node.js 18+
- A Supabase project ([supabase.com](https://supabase.com))
- A Vercel account (optional, for deployment)

### 1. Clone & install

```bash
git clone https://github.com/Sagsoul/Mbaredirect.git
cd Mbaredirect
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `CRON_SECRET` | Random secret string for cron job auth |
| `NEXT_PUBLIC_SITE_URL` | Production URL (`https://mbaredirect.co.zw`) |

### 3. Supabase Setup

#### a. Run the migration

In your Supabase dashboard → **SQL Editor**, paste and run:

```
supabase/migrations/001_initial_schema.sql
```

Or using the Supabase CLI:

```bash
supabase db push
```

#### b. Create the Storage bucket

1. Supabase Dashboard → **Storage** → **New Bucket**
2. Name: `verifications`
3. **Public:** ❌ OFF (keep private)
4. The admin dashboard uses signed URLs to access files securely

#### c. Set your first admin user

After creating your account via `/auth/register`, run this in the SQL editor:

```sql
update profiles set role = 'admin' where id = '<your-user-id>';
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Vercel Deployment

### 1. Push to GitHub, then connect to Vercel

```bash
git push origin main
```

Import the repo at [vercel.com/new](https://vercel.com/new).

### 2. Add environment variables

In Vercel project settings → **Environment Variables**, add all variables from `.env.example`.

### 3. Cron Job (365-day decay)

`vercel.json` already configures the cron:

```json
{
  "crons": [
    { "path": "/api/cron/decay", "schedule": "0 2 * * *" }
  ]
}
```

The cron runs daily at 02:00 UTC. It requires the `Authorization: Bearer <CRON_SECRET>` header — Vercel injects this automatically for cron routes.

---

## Verification Workflow

```
User registers → status: "unverified"
         ↓
User visits /verify:
  1. Sends $10 EcoCash payment
  2. Enters EcoCash reference + registered name
  3. Uploads National ID photo + Selfie
         ↓
status → "pending"
         ↓
Admin visits /admin:
  - Checks EcoCash ref against payment records
  - Matches ID name vs EcoCash name
  - Approve → status "verified" + subscription_expires_at = now + 365 days
  - Reject → status "rejected" + rejection_reason
         ↓
365 days later (cron job):
  status → "browser_only" (can browse but cannot post/pitch)
```

**Rejection reasons (dropdown):**
- Name Mismatch
- Invalid ID
- Payment not found
- Duplicate account
- Custom (free text)

---

## Security Architecture

### BlurGate (SSR-only gating)

Sensitive data (budget, pitch count, buyer reliability score) is **never sent to the browser** for unverified users. The `BlurGate` component conditionally renders on the server — there is no data in the DOM to un-blur via DevTools.

> **Why not CSS blur?** A `filter: blur()` style can be removed via browser DevTools, revealing the underlying text. Server-side rendering prevents the data from reaching the client at all.

### Storage Security

The `verifications` bucket is **private**. Only server components in `/admin` generate signed URLs with a 1-hour expiry. These URLs are never stored in the database.

### Admin Route Guard

The `/admin` route is protected at three layers:
1. **Middleware** — redirects non-admins server-side
2. **Server component** — double-checks role before rendering
3. **RLS policies** — database-level access control

---

## Zimbabwe-Specific Notes

### EcoCash Integration

Mbare Direct uses **manual EcoCash reconciliation**:
- Users send payment to a designated number
- They enter the transaction reference + their EcoCash registered name
- Admin manually verifies the payment matches

This avoids the complexity of direct API integration while keeping the process mobile-friendly.

### Data-Lite Design

- **System fonts only** — no Google Fonts download
- **No hero images** — emoji + bold text
- **No animations** — CSS transitions only
- **Minimal JS** — most pages are Server Components
- **WhatsApp sharing** — native app link, no SDK

### WhatsApp Share

Requests can be shared via WhatsApp using a pre-formatted deep link:

```
https://wa.me/?text=🛒 *Mbare Direct Request*%0A📦 Item: {item}%0A📍 Location: {location}%0A🏷️ Category: {category}%0A👉 Join at: https://mbaredirect.co.zw/requests/{id}
```

---

## Project Structure

```
/
├── app/
│   ├── layout.tsx              # Root layout with nav
│   ├── page.tsx                # Public request feed (SSR, BlurGate)
│   ├── globals.css
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── verify/page.tsx         # 3-step EcoCash + ID upload
│   ├── dashboard/
│   │   ├── buyer/page.tsx      # Post requests, view pitches
│   │   └── seller/page.tsx     # Browse feed, submit pitches
│   ├── admin/
│   │   └── page.tsx            # Verification dashboard
│   └── api/
│       ├── cron/decay/route.ts # 365-day membership decay
│       └── whatsapp/route.ts   # WhatsApp link generator
├── components/
│   ├── BlurGate.tsx            # SSR-safe content gate
│   ├── RequestCard.tsx
│   ├── PitchCard.tsx
│   ├── ReliabilityStars.tsx
│   └── VerificationBadge.tsx
├── lib/
│   ├── supabase/client.ts      # Browser Supabase client
│   ├── supabase/server.ts      # Server Supabase client
│   └── utils.ts
├── supabase/migrations/
│   └── 001_initial_schema.sql
├── middleware.ts               # Route protection
├── next.config.ts
├── tailwind.config.ts
├── vercel.json                 # Cron schedule
└── .env.example
```

---

## License

MIT — Built for Zimbabwe 🇿🇼
