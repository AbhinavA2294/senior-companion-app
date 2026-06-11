import { describe, it, expect } from "vitest";
import { RegisterSchema, LoginSchema } from "@/lib/validations/auth";
import { getDashboardPath, getRoleLabel, cn } from "@/lib/utils";

// ── RegisterSchema ───────────────────────────────────────────

describe("RegisterSchema", () => {
  const validBase = {
    email: "jane@example.com",
    password: "SecurePass1",
    confirmPassword: "SecurePass1",
    firstName: "Jane",
    lastName: "Smith",
    role: "senior" as const,
    agreeToTerms: true as const,
  };

  it("accepts valid senior registration", () => {
    expect(RegisterSchema.safeParse(validBase).success).toBe(true);
  });

  it("accepts valid companion registration", () => {
    const result = RegisterSchema.safeParse({ ...validBase, role: "companion" });
    expect(result.success).toBe(true);
  });

  it("accepts valid family registration", () => {
    const result = RegisterSchema.safeParse({ ...validBase, role: "family" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = RegisterSchema.safeParse({ ...validBase, email: "not-an-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("email");
    }
  });

  it("rejects password shorter than 8 chars", () => {
    const result = RegisterSchema.safeParse({
      ...validBase,
      password: "Ab1",
      confirmPassword: "Ab1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without uppercase letter", () => {
    const result = RegisterSchema.safeParse({
      ...validBase,
      password: "securepass1",
      confirmPassword: "securepass1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without number", () => {
    const result = RegisterSchema.safeParse({
      ...validBase,
      password: "SecurePassword",
      confirmPassword: "SecurePassword",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const result = RegisterSchema.safeParse({
      ...validBase,
      password: "SecurePass1",
      confirmPassword: "DifferentPass1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("confirmPassword");
    }
  });

  it("rejects missing terms agreement", () => {
    const data = { ...validBase, agreeToTerms: false };
    const result = RegisterSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = RegisterSchema.safeParse({ ...validBase, role: "superuser" });
    expect(result.success).toBe(false);
  });

  it("accepts valid phone number", () => {
    const result = RegisterSchema.safeParse({ ...validBase, phone: "+15550001234" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid phone number", () => {
    const result = RegisterSchema.safeParse({ ...validBase, phone: "not-a-phone" });
    expect(result.success).toBe(false);
  });

  it("accepts empty phone (optional)", () => {
    const result = RegisterSchema.safeParse({ ...validBase, phone: "" });
    expect(result.success).toBe(true);
  });
});

// ── LoginSchema ──────────────────────────────────────────────

describe("LoginSchema", () => {
  it("accepts valid credentials", () => {
    const result = LoginSchema.safeParse({ email: "jane@example.com", password: "anypassword" });
    expect(result.success).toBe(true);
  });

  it("rejects empty email", () => {
    const result = LoginSchema.safeParse({ email: "", password: "anypassword" });
    expect(result.success).toBe(false);
  });

  it("rejects malformed email", () => {
    const result = LoginSchema.safeParse({ email: "jane@", password: "anypassword" });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = LoginSchema.safeParse({ email: "jane@example.com", password: "" });
    expect(result.success).toBe(false);
  });
});

// ── getDashboardPath ─────────────────────────────────────────

describe("getDashboardPath", () => {
  it("returns /senior for senior role", () => {
    expect(getDashboardPath("senior")).toBe("/senior");
  });

  it("returns /family for family role", () => {
    expect(getDashboardPath("family")).toBe("/family");
  });

  it("returns /companion for companion role", () => {
    expect(getDashboardPath("companion")).toBe("/companion");
  });

  it("returns /admin for admin role", () => {
    expect(getDashboardPath("admin")).toBe("/admin");
  });
});

// ── getRoleLabel ─────────────────────────────────────────────

describe("getRoleLabel", () => {
  it("returns human-readable labels", () => {
    expect(getRoleLabel("senior")).toBe("Senior");
    expect(getRoleLabel("family")).toBe("Family Member");
    expect(getRoleLabel("companion")).toBe("Companion");
    expect(getRoleLabel("admin")).toBe("Administrator");
  });
});

// ── cn (className utility) ───────────────────────────────────

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    const result = cn("text-red-500", "text-blue-500");
    expect(result).toBe("text-blue-500");
  });

  it("handles conditional classes", () => {
    const active = true;
    expect(cn("base", active && "active")).toBe("base active");
    expect(cn("base", false && "inactive")).toBe("base");
  });

  it("handles undefined and null values", () => {
    expect(cn("base", undefined, null)).toBe("base");
  });
});
