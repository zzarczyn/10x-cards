import { z } from "zod";

/**
 * Validation result type
 */
type ValidationResult<T> = { success: true; data: T } | { success: false; error: { message: string } };

/**
 * Schema for email validation
 */
const EmailSchema = z.string().min(1, "Email jest wymagany").email("Podaj prawidłowy adres email");

/**
 * Schema for password validation (login)
 */
const PasswordSchema = z.string().min(6, "Hasło musi mieć minimum 6 znaków");

/**
 * Schema for strong password validation (registration)
 */
const StrongPasswordSchema = z
  .string()
  .min(8, "Hasło musi mieć minimum 8 znaków")
  .regex(/\d/, "Hasło musi zawierać przynajmniej jedną cyfrę");

/**
 * Schema for user login
 * Validates email format and minimum password length
 */
export const LoginSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});

/**
 * Schema for user registration
 * Requires stronger password with at least one digit
 */
export const RegisterSchema = z
  .object({
    email: EmailSchema,
    password: StrongPasswordSchema,
    confirmPassword: StrongPasswordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła muszą być identyczne",
    path: ["confirmPassword"],
  });

/**
 * Schema for forgot password request
 */
export const ForgotPasswordSchema = z.object({
  email: EmailSchema,
});

/**
 * Schema for password reset
 */
export const ResetPasswordSchema = z.object({
  password: StrongPasswordSchema,
});

/**
 * TypeScript types inferred from schemas
 */
export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

/**
 * Validates email address
 *
 * @param email - Email address to validate
 * @returns Validation result with success flag
 */
export function validateEmail(email: string): ValidationResult<string> {
  try {
    const validated = EmailSchema.parse(email);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: { message: error.errors[0]?.message || "Invalid email" },
      };
    }
    return { success: false, error: { message: "Invalid email" } };
  }
}

/**
 * Validates password (uses strong password requirements)
 *
 * @param password - Password to validate
 * @returns Validation result with success flag
 */
export function validatePassword(password: string): ValidationResult<string> {
  try {
    const validated = StrongPasswordSchema.parse(password);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: { message: error.errors[0]?.message || "Invalid password" },
      };
    }
    return { success: false, error: { message: "Invalid password" } };
  }
}

/**
 * Validates login input (email and password)
 *
 * @param input - Login credentials
 * @returns Validation result with success flag
 */
export function validateLoginInput(input: unknown): ValidationResult<LoginInput> {
  try {
    const validated = LoginSchema.parse(input);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: { message: error.errors[0]?.message || "Invalid login credentials" },
      };
    }
    return { success: false, error: { message: "Invalid login credentials" } };
  }
}

/**
 * Validates registration input (email, password, confirmPassword)
 *
 * @param input - Registration data
 * @returns Validation result with success flag
 */
export function validateRegisterInput(input: unknown): ValidationResult<RegisterInput> {
  try {
    const validated = RegisterSchema.parse(input);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: { message: error.errors[0]?.message || "Invalid registration data" },
      };
    }
    return { success: false, error: { message: "Invalid registration data" } };
  }
}
