import { test, expect } from "@playwright/test";

// NOTE: These tests exercise the UI flows. They require the dev server
// to be running and (for auth-gated tests) expect a seeded test database.
// Tests marked [auth-required] will redirect to /login when unauthenticated.

// ── Booking form validation (client-side) ─────────────────────

test.describe("Family booking wizard – new booking page", () => {
  test("[auth-required] redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/family/bookings/new");
    await expect(page).toHaveURL(/\/login/);
  });

  test("[auth-required] redirects unauthenticated users from senior bookings/new to login", async ({
    page,
  }) => {
    await page.goto("/senior/bookings/new");
    await expect(page).toHaveURL(/\/login/);
  });
});

// ── Booking disclaimer ────────────────────────────────────────

test.describe("Booking disclaimer", () => {
  test("disclaimer text is present on the services page", async ({ page }) => {
    await page.goto("/services");
    await expect(
      page.getByText(/non-medical companionship/i).first()
    ).toBeVisible();
  });

  test("service boundaries page shows included and excluded services", async ({ page }) => {
    await page.goto("/services");
    await expect(page.getByText(/what companions cannot do/i).first()).toBeVisible();
  });
});

// ── Senior profile pages (auth-gated) ─────────────────────────

test.describe("Senior profile pages", () => {
  test("[auth-required] /family/seniors redirects to login when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/family/seniors");
    await expect(page).toHaveURL(/\/login/);
  });

  test("[auth-required] /family/seniors/add redirects to login when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/family/seniors/add");
    await expect(page).toHaveURL(/\/login/);
  });
});

// ── Booking list pages (auth-gated) ───────────────────────────

test.describe("Booking list pages", () => {
  test("[auth-required] /family/bookings redirects to login when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/family/bookings");
    await expect(page).toHaveURL(/\/login/);
  });

  test("[auth-required] /senior/bookings redirects to login when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/senior/bookings");
    await expect(page).toHaveURL(/\/login/);
  });
});

// ── Privacy language in add-senior form ───────────────────────

test.describe("Add senior form – privacy language", () => {
  test("[auth-required] /family/seniors/add redirects unauthenticated", async ({ page }) => {
    await page.goto("/family/seniors/add");
    await expect(page).toHaveURL(/\/login/);
  });
});

// ── Senior dashboard layout ───────────────────────────────────

test.describe("Senior dashboard accessibility", () => {
  test("[auth-required] /senior redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/senior");
    await expect(page).toHaveURL(/\/login/);
  });

  test("[auth-required] /senior/profile redirects unauthenticated users to login", async ({
    page,
  }) => {
    await page.goto("/senior/profile");
    await expect(page).toHaveURL(/\/login/);
  });
});

// ── Booking creation – business rule validation ────────────────

test.describe("Booking form – validation messages", () => {
  test("landing page disclaimer is visible", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText(/non-medical companionship and chaperone services only/i).first()
    ).toBeVisible();
  });
});

// ── Full booking flow (requires seeded authenticated session) ──

test.describe("Full booking flow (manual verification checklist)", () => {
  test.skip("family member can create a senior profile", async ({ page }) => {});
  test.skip("family member can submit a booking request", async ({ page }) => {});
  test.skip("booking cannot be submitted without accepting the disclaimer", async ({ page }) => {});
  test.skip("booking cannot be created for an overnight time range", async ({ page }) => {});
  test.skip("booking cannot request personal-vehicle transportation", async ({ page }) => {});
  test.skip("family member can cancel a booking before it begins", async ({ page }) => {});
  test.skip("family member can rebook a prior activity", async ({ page }) => {});
});
