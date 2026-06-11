import { z } from "zod";

export const UserRoleSchema = z.enum(["senior", "family", "companion", "admin"]);

export const RegisterSchema = z
  .object({
    email: z.string().email("Please enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
      .regex(/[0-9]/, "Password must contain at least one number."),
    confirmPassword: z.string(),
    firstName: z.string().min(1, "First name is required.").max(50),
    lastName: z.string().min(1, "Last name is required.").max(50),
    role: UserRoleSchema,
    phone: z
      .string()
      .regex(/^\+?[1-9]\d{9,14}$/, "Please enter a valid phone number.")
      .optional()
      .or(z.literal("")),
    agreeToTerms: z.literal(true, {
      errorMap: () => ({ message: "You must agree to the terms of service." }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const LoginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export type RegisterFormData = z.infer<typeof RegisterSchema>;
export type LoginFormData = z.infer<typeof LoginSchema>;
