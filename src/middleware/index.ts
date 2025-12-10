import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.client.ts";

/**
 * Public paths that don't require authentication
 * - Auth pages (login, register, etc.)
 * - Auth API endpoints
 */
const PUBLIC_PATHS = [
  // Auth pages
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  // Auth API endpoints
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/callback",
];

/**
 * Global middleware for Astro
 * - Creates Supabase client with cookie-based session
 * - Validates authentication for protected API endpoints
 * - Adds user to context for authenticated requests
 */
export const onRequest = defineMiddleware(async (context, next) => {
  // Create Supabase instance with cookie handling
  // This automatically manages session from cookies
  const supabase = createSupabaseServerInstance({
    cookies: context.cookies,
    headers: context.request.headers,
  });

  // Add Supabase client to context for all requests
  context.locals.supabase = supabase;

  // For API endpoints, enforce authentication (except public paths)
  if (context.url.pathname.startsWith("/api/")) {
    // Skip auth check for public API endpoints
    if (PUBLIC_PATHS.includes(context.url.pathname)) {
      return next();
    }

    // Check authentication for protected API endpoints
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return new Response(
        JSON.stringify({
          error: "Authentication required",
          message: "Please log in to continue",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Add user to context for easy access in endpoints
    context.locals.user = user;
  }

  return next();
});
