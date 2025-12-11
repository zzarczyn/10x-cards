import type { APIRoute } from "astro";
import { LoginSchema } from "../../../lib/services/auth-validation.service.ts";
import { mapSupabaseAuthError } from "../../../lib/services/auth-error-mapping.service.ts";

/**
 * POST /api/auth/login
 *
 * Authenticates user with email and password
 * Sets httpOnly cookies for session management
 *
 * @returns 200 with user data on success
 * @returns 400 on validation error
 * @returns 401 on authentication failure
 * @returns 500 on server error
 */
export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Parse and validate request body
    const body = await request.json();
    const validationResult = LoginSchema.safeParse(body);

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

    // 2. Authenticate with Supabase
    const { data, error } = await locals.supabase.auth.signInWithPassword({
      email,
      password,
    });

    // 3. Handle authentication errors
    if (error) {
      const errorMessage = mapSupabaseAuthError(error);
      return new Response(
        JSON.stringify({
          error: "Authentication failed",
          message: errorMessage,
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Check if user exists (should always be true if no error)
    if (!data.user || !data.session) {
      return new Response(
        JSON.stringify({
          error: "Authentication failed",
          message: "Nieprawidłowy email lub hasło",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 5. Cookies are automatically set by @supabase/ssr
    // The createSupabaseServerInstance handles cookie management

    // 6. Return success response
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      }),
      {
        status: 200,
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
