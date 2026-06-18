---
name: project-stripe-payments
description: Stripe live payments blocked until booking flow is manually verified end-to-end
metadata:
  type: project
---

Do not enable live Stripe keys until the full booking → companion acceptance → payment authorization → check-in → check-out → payment capture flow has been manually verified end-to-end in a test environment.

**Why:** The payment architecture (Phase 6) is mock-only during the pilot. Live Stripe integration requires end-to-end testing first.

**How to apply:** If the user asks about Stripe keys or live payment configuration, remind them this gate exists.
