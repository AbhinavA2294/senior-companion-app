import { test, expect } from "@playwright/test";

// ── Landing page ─────────────────────────────────────────────

test.describe("Landing page", () => {
  test("loads successfully and shows headline", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Senior Companion/i);
    await expect(
      page.getByRole("heading", { name: /trusted companionship/i })
    ).toBeVisible();
  });

  test("shows the disclaimer text", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText(/non-medical companionship and chaperone services only/i).first()
    ).toBeVisible();
  });

  test("Book a Companion CTA links to register", async ({ page }) => {
    await page.goto("/");
    const bookCta = page.getByRole("link", { name: /book a companion/i }).first();
    await expect(bookCta).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/register/),
      bookCta.click(),
    ]);
    await expect(page).toHaveURL(/\/register/);
  });

  test("Become a Companion CTA links to register", async ({ page }) => {
    await page.goto("/");
    const companionCta = page.getByRole("link", { name: /become a companion/i }).first();
    await expect(companionCta).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/register/),
      companionCta.click(),
    ]);
    await expect(page).toHaveURL(/\/register/);
  });

  test("How It Works section is visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /how it works/i })).toBeVisible();
  });

  test("Trust and Safety section is visible", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /your safety is our foundation/i })
    ).toBeVisible();
  });

  test("Service boundaries section is visible", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /what we do.*don.*t do/i })
    ).toBeVisible();
  });

  test("Footer has Privacy Policy, Terms of Service, Contact Support links", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /privacy policy/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /terms of service/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /contact support/i })).toBeVisible();
  });
});

// ── Navigation ───────────────────────────────────────────────

test.describe("Navigation", () => {
  test("nav bar renders on home page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("link", { name: /senior companion/i }).first()).toBeVisible();
  });

  test("About page loads", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { name: /about senior companion/i })).toBeVisible();
  });

  test("Services page loads", async ({ page }) => {
    await page.goto("/services");
    await expect(page.getByRole("heading", { name: /our services/i })).toBeVisible();
  });

  test("skip to main content link is accessible", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: /skip to main content/i });
    await expect(skipLink).toBeFocused();
  });

  test("mobile menu opens and closes", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    const menuBtn = page.getByRole("button", { name: /open menu/i });
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();

    await expect(page.getByRole("navigation", { name: /mobile navigation/i })).toBeVisible();

    const closeBtn = page.getByRole("button", { name: /close menu/i });
    await closeBtn.click();
    await expect(
      page.getByRole("navigation", { name: /mobile navigation/i })
    ).toBeHidden();
  });
});

// ── Auth pages ───────────────────────────────────────────────

test.describe("Login page", () => {
  test("renders login form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("shows validation errors on empty submit", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();
  });

  test("shows validation error for invalid email", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email address/i).fill("not-an-email");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test("has link to register page", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /create one/i }).click();
    await expect(page).toHaveURL(/\/register/);
  });

  test("password toggle shows/hides password", async ({ page }) => {
    await page.goto("/login");
    const passwordInput = page.getByLabel(/password/i).first();
    await expect(passwordInput).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: /show password/i }).click();
    await expect(passwordInput).toHaveAttribute("type", "text");
  });
});

test.describe("Register page", () => {
  test("renders registration form with role selection", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /senior/i, exact: false }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /family member/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /companion/i, exact: false }).last()).toBeVisible();
  });

  test("can select different roles", async ({ page }) => {
    await page.goto("/register");
    const familyBtn = page.getByRole("button", { name: /family member/i });
    await familyBtn.click();
    await expect(familyBtn).toHaveClass(/border-sage-500/);
  });

  test("defaults role from URL param", async ({ page }) => {
    await page.goto("/register?role=companion");
    const companionBtn = page.getByRole("button", { name: /companion/i, exact: false }).last();
    await expect(companionBtn).toHaveClass(/border-sage-500/);
  });

  test("shows validation errors on empty submit", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("button", { name: /create my account/i }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();
  });

  test("has link back to login", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("link", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows password strength hint", async ({ page }) => {
    await page.goto("/register");
    await expect(
      page.getByText(/at least 8 characters with one uppercase/i)
    ).toBeVisible();
  });
});

// ── Accessibility ────────────────────────────────────────────

test.describe("Accessibility basics", () => {
  test("landing page has a single h1", async ({ page }) => {
    await page.goto("/");
    const h1s = await page.locator("h1").count();
    expect(h1s).toBe(1);
  });

  test("images have alt text or aria-hidden", async ({ page }) => {
    await page.goto("/");
    const imgs = page.locator("img");
    const count = await imgs.count();
    for (let i = 0; i < count; i++) {
      const alt = await imgs.nth(i).getAttribute("alt");
      const ariaHidden = await imgs.nth(i).getAttribute("aria-hidden");
      expect(alt !== null || ariaHidden === "true").toBeTruthy();
    }
  });

  test("login form inputs have labels", async ({ page }) => {
    await page.goto("/login");
    const emailLabel = page.locator("label").filter({ hasText: /email/i });
    await expect(emailLabel).toBeVisible();
  });

  test("register form uses fieldset for role selection", async ({ page }) => {
    await page.goto("/register");
    const fieldset = page.locator("fieldset");
    await expect(fieldset).toBeVisible();
    await expect(fieldset.locator("legend")).toBeVisible();
  });
});

// ── Mobile responsiveness ────────────────────────────────────

test.describe("Mobile layout", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("landing page is usable on mobile", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /book a companion/i }).first()).toBeVisible();
  });

  test("register page is usable on mobile", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /create my account/i })).toBeVisible();
  });
});
