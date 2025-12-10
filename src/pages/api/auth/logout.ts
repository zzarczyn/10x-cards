import type { APIRoute } from "astro";

/**
 * POST /api/auth/logout
 * 
 * Logs out the current user by:
 * - Calling Supabase auth.signOut()
 * - Clearing session cookies (handled by @supabase/ssr)
 * 
 * Note: This endpoint ALWAYS returns success (fail-safe design)
 * Even if Supabase signOut fails, we clear cookies and treat as success
 * 
 * @returns 200 with { success: true } (always)
 */
export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  try {
    // 1. Sign out from Supabase
    // This invalidates the session on Supabase side
    const { error } = await locals.supabase.auth.signOut();

    if (error) {
      console.error("Supabase logout error:", error);
      // Continue anyway - we still want to clear cookies client-side
    }

    // 2. Cookies are automatically cleared by @supabase/ssr
    // The createSupabaseServerInstance handles cookie management
    // signOut() will trigger cookie removal through the cookie adapter

    // 3. Always return success (fail-safe)
    // Logout should always "succeed" from user's perspective
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Logout endpoint error:", err);
    
    // Even if something goes wrong, return success
    // User will be redirected to login page and cookies will be invalid anyway
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};

