import { defineMiddleware } from "astro:middleware";

import { supabaseClient } from "../db/supabase.client.ts";

/**
 * Global middleware for Astro
 * - Adds Supabase client to context
 * - Validates authentication for API endpoints
 */
export const onRequest = defineMiddleware(async (context, next) => {
  // Add Supabase client to context for all requests
  context.locals.supabase = supabaseClient;

  // For API endpoints, enforce authentication
  if (context.url.pathname.startsWith("/api/")) {
    const {
      data: { user },
      error,
    } = await context.locals.supabase.auth.getUser();

    if (error || !user) {
      return new Response(
        JSON.stringify({
          error: "Authentication required",
          message: "Please log in to continue",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Add user to context for easy access in endpoints
    context.locals.user = user;
  }

  return next();
});
