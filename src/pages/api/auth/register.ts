import type { APIRoute } from "astro";
import { RegisterSchema } from "../../../lib/services/auth-validation.service.ts";
import { mapSupabaseAuthError } from "../../../lib/services/auth-error-mapping.service.ts";

/**
 * POST /api/auth/register
 *
 * Registers a new user with Supabase Auth
 * Sends email verification link
 *
 * @returns 201 with userId on success
 * @returns 400 on validation error
 * @returns 409 if email already registered
 * @returns 500 on server error
 */
export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Parse and validate request body
    const body = await request.json();
    const validationResult = RegisterSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          message: validationResult.error.issues[0]?.message || "Nieprawidłowe dane",
          details: validationResult.error.issues.map((issue) => ({
            field: issue.path[0],
            message: issue.message,
          })),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { email, password } = validationResult.data;

    // 2. Register user with Supabase Auth
    const { data, error } = await locals.supabase.auth.signUp({
      email,
      password,
      options: {
        // Email confirmation redirect URL
        emailRedirectTo: `${new URL(request.url).origin}/auth/login?message=email-confirmed`,
      },
    });

    // 3. Handle Supabase errors
    if (error) {
      const errorMessage = mapSupabaseAuthError(error);

      // Check if it's a duplicate email error
      if (
        error.message.toLowerCase().includes("already registered") ||
        error.message.toLowerCase().includes("user already registered")
      ) {
        return new Response(
          JSON.stringify({
            error: "Registration failed",
            message: "Ten adres email jest już zarejestrowany",
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: "Registration failed",
          message: errorMessage,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Check if user was created
    if (!data.user) {
      return new Response(
        JSON.stringify({
          error: "Registration failed",
          message: "Nie udało się utworzyć konta. Spróbuj ponownie.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 5. Auto-login user after registration (email confirmation is disabled in config)
    if (data.session) {
      // Set session cookie for auto-login
      await locals.supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }

    // 6. Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Konto zostało utworzone pomyślnie",
        userId: data.user.id,
        autoLogin: !!data.session,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
