# Senior Companion

> Trusted, verified companionship for the moments that matter.

Senior Companion is a non-medical companionship marketplace for senior citizens. Seniors or their adult children can book a verified companion for outings, appointments, errands, and social activities.

**This is not a healthcare, home-care, medical, or rideshare application.**

---

## Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the App](#running-the-app)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Payment Architecture](#payment-architecture)
- [Stripe Connect Integration Path](#stripe-connect-integration-path)
- [User Roles](#user-roles)
- [Service Boundaries](#service-boundaries)
- [Manual Verification Checklist](#manual-verification-checklist)
- [Tech Stack](#tech-stack)

---

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd senior-companion
npm install

# 2. Copy env file and fill in values
cp .env.example .env.local

# 3. Start Supabase locally
npx supabase start

# 4. Run migrations and seed data
npx supabase db push
npx supabase db seed --file supabase/seed.sql

# 5. Start the dev server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 18.x or 20.x | [nodejs.org](https://nodejs.org) |
| npm | 9.x+ | Bundled with Node |
| Supabase CLI | Latest | `npm i -g supabase` |
| Docker Desktop | Latest | Required for local Supabase |

---

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase locally

Make sure Docker Desktop is running, then:

```bash
# Initialise Supabase (skip if supabase/ folder already exists)
npx supabase init

# Start local Supabase stack (Postgres, Auth, Studio, etc.)
npx supabase start
```

After `supabase start`, your terminal will print connection details like:

```
API URL: http://127.0.0.1:54321
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
Anon key: eyJ...
Service role key: eyJ...
```

Copy these into your `.env.local` file.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-supabase-start>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-supabase-start>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run database migrations

```bash
npx supabase db push
```

This applies `supabase/migrations/20240101000000_initial_schema.sql` which creates:

- All tables (profiles, bookings, companion_profiles, etc.)
- All enums (user_role, booking_status, etc.)
- Row-level security policies
- Triggers for `updated_at` and auto-profile creation

### 5. Seed activity types

```bash
npx supabase db seed --file supabase/seed.sql
```

This inserts the 10 canonical activity types (Doctor appointment chaperone, Walk or park visit, etc.)

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key — **never expose to client** |
| `NEXT_PUBLIC_APP_URL` | ✅ | Base URL for email redirect links |

---

## Database Setup

### Schema overview

```
auth.users (Supabase managed)
    │
    └── profiles (one per user, role enum: senior/family/companion/admin)
            ├── senior_profiles (extended senior info)
            ├── companion_profiles (verification status, hourly rate)
            └── family_senior_relationships (links family → senior)

bookings
    ├── booking_status_history
    ├── check_in_events
    ├── ratings
    └── incident_reports

activity_types (seeded: 10 categories)
emergency_contacts
notifications
companion_verifications
```

### Row-Level Security

Every table has RLS enabled. Key policies:

- Users can only read/write **their own** profile data
- Family members can view data for **linked seniors only**
- Companions can view **assigned bookings only**
- Admins can access everything
- Approved companions are visible in companion listings

### Resetting the local database

```bash
npx supabase db reset
# Then re-seed:
npx supabase db seed --file supabase/seed.sql
```

---

## Running the App

```bash
# Development
npm run dev

# Production build
npm run build
npm start

# Lint
npm run lint

# Type check
npm run type-check

# Format
npm run format
```

---

## Testing

### Unit tests (Vitest)

```bash
npm test
# or watch mode:
npm test -- --watch
```

Unit tests cover:
- `RegisterSchema` — all validation rules
- `LoginSchema` — email + password validation
- `getDashboardPath` — role → path mapping
- `getRoleLabel` — role → human label
- `cn` — className merging utility

### End-to-end tests (Playwright)

```bash
# Install browsers (first time only)
npx playwright install

# Run E2E tests (starts dev server automatically)
npm run test:e2e

# Run with UI
npx playwright test --ui

# Specific file
npx playwright test tests/e2e/app.spec.ts
```

E2E tests cover:
- Landing page content and CTAs
- Navigation (desktop and mobile)
- About and Services pages
- Login form validation
- Register form with role selection
- Accessibility basics (h1 count, labels, fieldsets)
- Mobile layout

---

## Project Structure

```
senior-companion/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # Login form
│   │   └── register/page.tsx       # Registration with role selection
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Dashboard shell with sidebar nav
│   │   ├── senior/page.tsx         # Senior dashboard
│   │   ├── family/page.tsx         # Family dashboard
│   │   ├── companion/page.tsx      # Companion dashboard
│   │   └── admin/page.tsx          # Admin dashboard
│   ├── auth/
│   │   ├── callback/route.ts       # Email confirmation callback
│   │   └── signout/route.ts        # Sign-out handler
│   ├── about/page.tsx              # About page
│   ├── services/page.tsx           # Services & boundaries page
│   ├── globals.css                 # Tailwind + CSS variables
│   ├── layout.tsx                  # Root layout with fonts
│   └── page.tsx                    # Landing page
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx              # Sticky responsive navigation
│   │   └── Footer.tsx              # Footer with disclaimer
│   ├── landing/
│   │   ├── Hero.tsx                # Hero section
│   │   ├── HowItWorks.tsx          # 4-step process
│   │   ├── ActivitiesShowcase.tsx  # Activity grid
│   │   ├── TrustSafety.tsx         # Safety features
│   │   └── ServiceBoundaries.tsx   # What we do/don't do
│   └── ui/                         # shadcn/ui components
│       ├── alert.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── label.tsx
│       └── separator.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser Supabase client
│   │   └── server.ts               # Server Supabase client + admin client
│   ├── validations/
│   │   └── auth.ts                 # Zod schemas for auth forms
│   └── utils.ts                    # cn(), getDashboardPath(), etc.
├── supabase/
│   ├── config.toml                 # Supabase CLI config
│   ├── migrations/
│   │   └── 20240101000000_initial_schema.sql
│   └── seed.sql                    # Activity types seed data
├── tests/
│   ├── e2e/app.spec.ts             # Playwright end-to-end tests
│   ├── unit/validations.test.ts    # Vitest unit tests
│   └── setup.ts                    # Test setup
├── types/index.ts                  # All TypeScript types
├── .env.example                    # Environment variable template
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── vitest.config.ts
└── playwright.config.ts
```

---

## User Roles

| Role | Description | Dashboard |
|---|---|---|
| **Senior** | Books companions for themselves | `/senior` |
| **Family** | Books companions for one or more seniors | `/family` |
| **Companion** | Accepts and fulfills booking requests | `/companion` |
| **Admin** | Manages platform, verifications, incidents | `/admin` |

Registration is self-service for senior, family, and companion roles. Admin accounts are created directly in Supabase.

---

## Service Boundaries

Senior Companion provides **non-medical companionship and chaperone services only**.

### ✅ Companions can

- Accompany seniors to doctor appointments (as a chaperone, not medical support)
- Join walks, park visits, café and restaurant outings
- Help with grocery shopping and errands
- Attend religious, cultural, and social events
- Provide conversation, read aloud, play games
- Assist with basic technology tasks

### ❌ Companions cannot

- Provide medical care, advice, or diagnosis
- Administer or manage medications
- Assist with bathing, dressing, toileting, or personal hygiene
- Drive seniors in their personal vehicle
- Provide emergency medical transportation
- Manage finances, banking, or large cash transactions
- Provide overnight care

---

## Manual Verification Checklist

After running the app locally, verify the following:

### Landing page
- [ ] Headline "Trusted companionship for the moments that matter" is visible
- [ ] "Book a Companion" button navigates to `/register`
- [ ] "Become a Companion" button navigates to `/register`
- [ ] "How It Works" section shows 4 steps
- [ ] "Your safety is our foundation" section is visible
- [ ] Service boundaries section shows ✅ and ❌ lists
- [ ] Disclaimer is visible in footer and service boundaries
- [ ] Footer has Privacy Policy, Terms of Service, Contact Support links
- [ ] Page is readable on mobile (375px viewport)

### Registration
- [ ] `/register` loads with 3 role options (Senior, Family, Companion)
- [ ] Clicking a role card highlights it and sets `aria-pressed="true"`
- [ ] `?role=companion` URL pre-selects Companion
- [ ] Form validates email, password strength, password match, and terms checkbox
- [ ] Submit creates an account and redirects to the correct dashboard

### Login
- [ ] `/login` loads with email and password fields
- [ ] Password show/hide toggle works
- [ ] Incorrect credentials shows an error message
- [ ] Successful login redirects to the role-appropriate dashboard

### Dashboards
- [ ] `/senior` is accessible only when logged in as a senior
- [ ] `/family` is accessible only when logged in as a family member
- [ ] `/companion` shows verification status badge
- [ ] `/admin` is accessible only when logged in as an admin
- [ ] Unauthenticated access to any dashboard redirects to `/login`
- [ ] Sign out returns user to home page

### Database
- [ ] `supabase db push` runs without errors
- [ ] `supabase db seed` inserts 10 activity types
- [ ] Supabase Studio at `http://localhost:54323` shows all tables

### Accessibility
- [ ] Tab key reaches "Skip to main content" link first
- [ ] All form inputs have visible labels
- [ ] Focus rings are visible on keyboard navigation
- [ ] Page is readable at 200% zoom

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Components | shadcn/ui + Radix UI |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Validation | Zod |
| Forms | React Hook Form |
| Unit Tests | Vitest + Testing Library |
| E2E Tests | Playwright |
| Linting | ESLint |
| Formatting | Prettier |

---

## Security Notes

- The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. It is used server-side only and never exposed to the client.
- All tables use Row-Level Security (RLS). Users cannot read or modify data outside their access scope.
- Passwords are managed entirely by Supabase Auth — never stored in the application.
- The booking disclaimer (`disclaimer_acknowledged`) is a required field — it cannot be omitted at the database level.
- Companion profiles require admin approval (`verification_status = 'approved'`) before becoming visible to seniors.

---

## Payment Architecture

The application uses a `PaymentProvider` interface in `lib/payments/` so payment gateway logic is swappable without rewriting business logic.

### Current: MockPaymentProvider

All payments use `MockPaymentProvider` (no real charges). The singleton lives in `lib/payments/index.ts`:

```ts
export const paymentProvider: PaymentProvider = new MockPaymentProvider()
```

### Pricing (configured in `lib/payments/config.ts`)

| Item | Amount |
|---|---|
| Hourly rate | $35.00/hr |
| Platform fee | 20% of service amount |
| Companion payout | 80% of service amount (~$28.00/hr) |
| Booking fee | $5.00 (flat, retained by platform) |
| Cancellation fee | $15.00 |
| Minimum duration | 2 hours |

### Payment lifecycle

```
Booking submitted   → payment: authorized
Visit completed     → payment: captured
Booking cancelled   → payment: cancelled
Admin issues refund → payment: refunded / partially_refunded
```

All financial calculations live in `lib/payments/payment-service.ts` (pure functions, fully tested).

---

## Stripe Connect Integration Path

> **Do not activate Stripe until the full booking flow has been manually tested end-to-end.**

When ready, follow these steps to add live payments:

### 1. Install the Stripe SDK

```bash
npm install stripe @stripe/stripe-js
```

### 2. Add environment variables

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Implement `StripePaymentProvider`

Create `lib/payments/stripe-provider.ts` implementing the same `PaymentProvider` interface:

```ts
import Stripe from 'stripe'
import type { PaymentProvider, GatewayPaymentIntent, ... } from './types'

export class StripePaymentProvider implements PaymentProvider {
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  async createPaymentIntent(params) {
    const pi = await this.stripe.paymentIntents.create({
      amount: params.amountCents,
      currency: params.currency ?? 'usd',
      application_fee_amount: params.platformFeeCents,
      transfer_data: { destination: '<companion_stripe_account_id>' },
      metadata: { bookingId: params.bookingId },
    })
    return { id: pi.id, status: 'pending', amountCents: pi.amount, currency: pi.currency }
  }

  async capturePayment(providerPaymentId) {
    const pi = await this.stripe.paymentIntents.capture(providerPaymentId)
    return { id: pi.id, status: 'captured', amountCents: pi.amount, currency: pi.currency }
  }
  // ... implement remaining methods
}
```

### 4. Swap the singleton

In `lib/payments/index.ts`, change one line:

```ts
// Before:
export const paymentProvider: PaymentProvider = new MockPaymentProvider()

// After:
export const paymentProvider: PaymentProvider = new StripePaymentProvider()
```

No other application code changes — all server actions already use `paymentProvider`.

### 5. Companion onboarding (Stripe Connect)

Each companion needs a Stripe Express or Standard account:
- Add `stripe_account_id` column to `companion_profiles`
- Redirect companions through Stripe Connect OAuth on their verification page
- Use `transfer_data.destination` in payment intents to route payouts

### 6. Add Stripe webhook handler

Create `app/api/webhooks/stripe/route.ts` to handle:
- `payment_intent.succeeded` → update payment status to `captured`
- `payment_intent.payment_failed` → update to `failed`
- `charge.refunded` → update to `refunded` / `partially_refunded`

Webhook events provide authoritative status — supplement or replace the optimistic DB writes in server actions.

### 7. Collect payment method at booking

Add a Stripe Elements form to the booking wizard review step (step 5) to tokenize the card. Store only the `payment_method_id` — never the raw card number. The current `PriceBreakdown` component already shows the pricing summary in that step.

---

## Phase 2 (not yet implemented)

The following features are planned but **not built yet**:

- Companion search and matching
- SMS/email notifications
- AI-powered companion recommendations
- Advanced admin reporting

---

*Senior Companion provides non-medical companionship and chaperone services only. Companions do not provide medical care, personal care, emergency transportation, or financial services.*
