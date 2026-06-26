# Senior Companion — Production Deployment Guide

> **Pilot version 0.1** — for a community pilot of up to 25 seniors and 20 companions.  
> Every companion must be manually approved by an admin before they can accept bookings.

---

## 1. Pre-deployment checklist

Before deploying, confirm every item below:

### Environment variables
| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | **Secret** — never expose to client |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key |
| `STRIPE_SECRET_KEY` | Yes | **Secret** — Stripe live key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook endpoint signing secret |
| `PILOT_FEEDBACK_ENABLED` | No | `"false"` to disable feedback forms |
| `PILOT_VOICE_BOOKING` | No | `"false"` to disable voice booking |
| `MATCHING_ENABLED` | No | `"false"` to disable AI matching |
| `PILOT_REQUIRE_FIRST_BOOKING_REVIEW` | No | `"false"` to disable first-booking flag |

> **Stripe live keys**: do not enable live Stripe keys until the full booking process has been manually tested end-to-end (create booking → companion acceptance → check-in → check-out → receipt).

### Supabase checklist
- [ ] All migrations applied (`20240101` through `20240210`)
- [ ] RLS enabled on every table
- [ ] `auth_profile_id()` and `auth_user_role()` SECURITY DEFINER functions exist
- [ ] `companion-documents` storage bucket is **private** (no public read access)
- [ ] Email confirmation enabled in Auth settings
- [ ] Password minimum strength set to "medium" or higher
- [ ] Realtime only enabled for tables that need it

### Vercel checklist
- [ ] All environment variables set in Vercel dashboard (not in `.env.local`)
- [ ] Preview environments use test Supabase and Stripe keys
- [ ] Production environment uses live Supabase and Stripe keys
- [ ] Build command: `next build`
- [ ] Output directory: `.next`
- [ ] Node version: 18 or 20

---

## 2. Deployment steps (Vercel + Supabase)

### Supabase migrations
```bash
# Apply all pending migrations to hosted Supabase
npx supabase db push

# Verify migrations were applied
npx supabase db status
```

### Vercel deployment
```bash
# Install Vercel CLI (one-time)
npm install -g vercel

# Deploy to production
vercel --prod

# Or push to main branch if GitHub integration is configured
git push origin main
```

### Post-deployment verification
```bash
# Check that the application is live
curl -I https://your-app.vercel.app/

# Verify Supabase connection (check that /login loads)
# Sign in as admin and verify the admin dashboard is accessible
```

---

## 3. Database migration process

Always run migrations against a staging environment first:

```bash
# 1. Link to your Supabase project (one-time)
npx supabase link --project-ref <your-project-ref>

# 2. Apply migrations to staging
npx supabase db push --linked

# 3. Test staging thoroughly

# 4. Apply to production (same command — migrations are idempotent)
npx supabase db push

# 5. If push fails, review the error and run the migration file manually
#    via the Supabase dashboard SQL editor
```

Migration files are in `supabase/migrations/` numbered chronologically.

---

## 4. Rollback steps

### Vercel rollback (instant)
1. Go to Vercel dashboard → Deployments
2. Find the last known-good deployment
3. Click "Promote to Production"

### Database rollback
The migrations are additive (no destructive changes). To undo:
- New tables: `DROP TABLE IF EXISTS <table_name> CASCADE;`
- New columns: `ALTER TABLE <table> DROP COLUMN IF EXISTS <column>;`
- New views: `DROP VIEW IF EXISTS <view_name>;`

⚠️ Never drop tables that contain user data without backing up first.

---

## 5. Backup and recovery

### Database backups
- Supabase automatically takes daily backups (retained 7 days on Pro plan)
- Before any migration: download a manual backup from Supabase dashboard → Settings → Backups
- To restore: Supabase dashboard → Settings → Backups → Restore

### Point-in-time recovery
Available on Supabase Pro and Team plans. For the pilot, ensure the project is on Pro or higher.

### What to back up before each deployment
```bash
# Export current data (requires psql)
pg_dump "postgresql://..." --format=custom --file="backup_$(date +%Y%m%d_%H%M%S).dump"
```

### Recovery time objectives (pilot targets)
| Scenario | Target recovery time |
|---|---|
| Vercel deployment failure | < 5 minutes (revert via dashboard) |
| Bad database migration | < 30 minutes (manual SQL rollback) |
| Database corruption | < 4 hours (restore from daily backup) |

---

## 6. Pilot test script

Run this script manually before declaring the pilot ready for users.

### Setup
- [ ] Create 2 admin accounts
- [ ] Create 3 senior accounts
- [ ] Create 5 companion accounts (and approve 3 of them)
- [ ] Create family accounts linked to 2 of the seniors

### Booking flow
- [ ] Family member creates a booking for a senior
- [ ] Admin assigns an approved companion
- [ ] Companion sees booking in their dashboard and accepts
- [ ] Admin sees acceptance and confirms assignment
- [ ] Companion checks in (GPS logged)
- [ ] Companion checks out (GPS logged)
- [ ] Booking shows as "completed"
- [ ] Senior and family can view receipt
- [ ] Family member submits feedback form
- [ ] Rating appears in admin dashboard

### Payment flow
- [ ] Booking creates a payment hold
- [ ] Acceptance converts hold to charge
- [ ] Cancellation (>24h) refunds payment
- [ ] Admin can issue manual refund from admin dashboard

### Voice booking
- [ ] Senior/family can access voice booking wizard
- [ ] Text entry extracts booking fields
- [ ] Review screen shows all extracted fields
- [ ] Disclaimer checkbox is required
- [ ] Booking submits and appears in admin queue

### Admin operations
- [ ] Admin can view all bookings with filters
- [ ] Admin can assign/unassign companions
- [ ] Admin can submit internal notes on a booking
- [ ] Admin can view incident reports
- [ ] Admin can export CSV
- [ ] Admin can update pilot settings and see changes take effect
- [ ] Pilot metrics page shows correct counts

### Edge cases
- [ ] Booking before service hours is blocked
- [ ] Booking after service hours is blocked
- [ ] Overnight booking is blocked
- [ ] Booking with < 12h advance notice is blocked
- [ ] Non-approved companion does not appear in matching

---

## 7. Admin training checklist

### Day 1 — Platform orientation
- [ ] Log in as admin and navigate every section
- [ ] Review the Companion Code of Conduct with team
- [ ] Review pilot constraints (no overnight, no driving, no emergencies)
- [ ] Understand the booking status flow: requested → assigned → accepted → in_progress → completed

### Companion approval
- [ ] How to review companion applications
- [ ] Background check verification process
- [ ] How to approve/suspend a companion
- [ ] What makes a companion ineligible

### Booking management
- [ ] How to assign a companion to a booking
- [ ] What "first booking flag" means and how to handle it
- [ ] How to handle a late check-in (>15 min): call companion, then call senior
- [ ] How to handle a no-show: contact companion, reassign if possible, notify family
- [ ] How to submit an incident report

### Pilot operations
- [ ] How to update pilot settings (service hours, advance notice, etc.)
- [ ] How to read the pilot metrics dashboard
- [ ] How to export CSV for weekly review
- [ ] How to handle a refund request

### Escalation
- [ ] Medical emergency during visit: companion calls 911, admin notified, incident report created within 24h
- [ ] Senior complaint: submit internal note on booking, follow up within 1 business day
- [ ] Companion complaint: submit incident report, suspend companion if safety concern

---

## 8. Family onboarding checklist

Steps to onboard a new family member during the pilot:

- [ ] Provide family member with the signup URL
- [ ] Family member registers with role "Family Member"
- [ ] Admin links family member to senior's profile
- [ ] Walk through: how to create a booking, what information is needed
- [ ] Explain: bookings must be at least 12 hours in advance
- [ ] Explain: service hours (8 AM – 8 PM)
- [ ] Explain: companions do not drive, do not provide medical care
- [ ] Explain: how to track a visit via check-in notifications
- [ ] Explain: what to do in an emergency (call 911 first)
- [ ] Provide support phone number: 1-800-555-CARE
- [ ] Explain how to submit feedback after a completed visit

---

## 9. Companion onboarding checklist

Steps to onboard a new companion during the pilot:

- [ ] Companion registers with role "Companion"
- [ ] Admin reviews application and background check
- [ ] Admin approves companion (sets `verification_status = 'approved'`)
- [ ] Companion completes profile: bio, languages, hourly rate, availability
- [ ] Admin confirms availability is set correctly
- [ ] Walk through: how to view and accept booking requests
- [ ] Walk through: check-in and check-out process
- [ ] Review the Companion Code of Conduct (companion must acknowledge)
- [ ] Review service boundaries verbally:
  - No overnight visits
  - No driving
  - No medical care or personal care
  - No cash — all payment through the platform
  - Call 911 in any medical emergency
- [ ] Confirm companion has support phone number
- [ ] Shadow visit: first booking is reviewed by admin before assignment

---

## 10. Known limitations (Pilot v0.1)

1. **No companion driving** — Transportation is walk, public transit, or rideshare only. Companion's personal vehicle is not an option.

2. **Pre-scheduled only** — No same-day or emergency bookings. Minimum 12 hours advance notice.

3. **Manual companion assignment** — The AI matching engine makes suggestions but an admin must manually assign. Admins must review every AI recommendation.

4. **English-first** — i18n translations for Spanish, Hindi, and Tamil are placeholders. Only English is fully tested.

5. **Server-side components render English only** — The language selector applies to client-rendered UI only.

6. **No real-time notifications** — Notifications are polling-based, not push-based. Users must refresh to see updates.

7. **Single service area** — Geographic enforcement is descriptive only (no geofencing). Admin must reject bookings outside the service area manually.

8. **Payment hold only** — The payment system holds the full amount at booking but does not pro-rate for early check-out.

9. **Contact form is a placeholder** — The support page contact form does not send email yet. Users must email directly.

10. **No data deletion workflow** — The GDPR Right-to-Erasure table exists but the anonymization workflow is manual. Required before any regulated data territory launch.

---

## 11. Post-50-booking priorities

After the first 50 completed bookings, the following items should be implemented before scaling:

1. **Right-to-Erasure automation** — Build the GDPR account deletion workflow (`account_deletion_requests` table)
2. **Real-time notifications** — Replace polling with Supabase Realtime subscriptions
3. **Production error monitoring** — Replace ConsoleMonitoringAdapter with Sentry or Datadog
4. **Contact form backend** — Wire the support page form to email via SendGrid or Postmark
5. **Geographic enforcement** — Validate booking location against allowed ZIP codes on the server
6. **Companion driving option** — Only after completing insurance and liability review
7. **Mobile apps** — Native iOS/Android companion app for better check-in UX
8. **Automatic companion suggestion** — Surface top-3 AI match recommendations directly in the admin assignment flow
9. **Family notification preferences** — Let families choose SMS vs email for booking updates
10. **Legal document finalisation** — Have an attorney review and finalise Privacy Policy, Terms of Service, and Companion Agreement before public launch
