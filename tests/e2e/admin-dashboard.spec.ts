import { test, expect } from "@playwright/test";

// ── Phase 5: Admin Dashboard E2E Tests ────────────────────────

// ── Auth protection ───────────────────────────────────────────
test.describe("Admin route protection", () => {
  test("unauthenticated user cannot access admin dashboard", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user cannot access admin bookings", async ({ page }) => {
    await page.goto("/admin/bookings");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user cannot access admin companions", async ({ page }) => {
    await page.goto("/admin/companions");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user cannot access admin reports", async ({ page }) => {
    await page.goto("/admin/reports");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user cannot access audit log", async ({ page }) => {
    await page.goto("/admin/audit");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user cannot access export page", async ({ page }) => {
    await page.goto("/admin/export");
    await expect(page).toHaveURL(/\/login/);
  });
});

// ── Public pages still accessible ────────────────────────────
test.describe("Public pages accessible", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/non-medical companionship/i).first()).toBeVisible();
  });

  test("services page loads", async ({ page }) => {
    await page.goto("/services");
    await expect(page.getByText(/what companions cannot do/i).first()).toBeVisible();
  });
});

// ── Full admin flows (requires seeded authenticated session) ──
test.describe("Admin dashboard flows (manual verification checklist)", () => {
  test.skip("admin can view dashboard metrics widgets", async ({ page }) => {});
  test.skip("admin can filter bookings by status", async ({ page }) => {});
  test.skip("admin can search bookings by senior name", async ({ page }) => {});
  test.skip("admin can assign companion to booking", async ({ page }) => {});
  test.skip("admin can approve companion application", async ({ page }) => {});
  test.skip("admin can suspend companion", async ({ page }) => {});
  test.skip("suspended companion cannot accept bookings", async ({ page }) => {});
  test.skip("admin can add internal note to booking", async ({ page }) => {});
  test.skip("admin can issue mock refund with confirmation dialog", async ({ page }) => {});
  test.skip("admin can view audit log entries", async ({ page }) => {});
  test.skip("admin can export CSV", async ({ page }) => {});
  test.skip("admin can mark booking as needs_review", async ({ page }) => {});
  test.skip("admin actions appear in audit log", async ({ page }) => {});
  test.skip("late check-in flag visible in bookings table", async ({ page }) => {});
  test.skip("open incidents shown in admin reports queue", async ({ page }) => {});
  test.skip("pagination works on bookings list", async ({ page }) => {});
  test.skip("search filters companion list correctly", async ({ page }) => {});
});
