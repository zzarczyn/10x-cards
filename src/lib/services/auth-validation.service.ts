import { z } from "zod";

/**
 * Schema for user login
 * Validates email format and minimum password length
 */
export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, "Email jest wymagany")
    .email("Podaj prawidłowy adres email"),
  password: z.string().min(6, "Hasło musi mieć minimum 6 znaków"),
});

/**
 * Schema for user registration
 * Requires stronger password with at least one digit
 */
export const RegisterSchema = z.object({
  email: z
    .string()
    .min(1, "Email jest wymagany")
    .email("Podaj prawidłowy adres email"),
  password: z
    .string()
    .min(8, "Hasło musi mieć minimum 8 znaków")
    .regex(/\d/, "Hasło musi zawierać przynajmniej jedną cyfrę"),
});

/**
 * Schema for forgot password request
 */
export const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email jest wymagany")
    .email("Podaj prawidłowy adres email"),
});

/**
 * Schema for password reset
 */
export const ResetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Hasło musi mieć minimum 8 znaków")
    .regex(/\d/, "Hasło musi zawierać przynajmniej jedną cyfrę"),
});

/**
 * TypeScript types inferred from schemas
 */
export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

