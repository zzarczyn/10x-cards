import { useState } from "react";
import { Button } from "../ui/button";
import type { UserMenuProps } from "../../types";

/**
 * UserMenu component
 * 
 * Displays user information and logout functionality in Dashboard header
 * 
 * Features:
 * - User email display (truncated if too long)
 * - User avatar icon
 * - Logout button with loading state
 * - Handles logout API call and redirect
 * 
 * Position: Top-right corner of Dashboard
 */
export function UserMenu({ userEmail }: UserMenuProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /**
   * Truncates email if longer than maxLength
   * Example: "verylongemailaddress@example.com" → "verylonge...@example.com"
   */
  const truncateEmail = (email: string, maxLength = 25): string => {
    if (email.length <= maxLength) return email;

    const [localPart, domain] = email.split("@");
    const maxLocalLength = maxLength - domain.length - 4; // -4 for "...@"

    if (localPart.length > maxLocalLength) {
      return `${localPart.substring(0, maxLocalLength)}...@${domain}`;
    }

    return email;
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        // Force page reload and redirect to login
        // This ensures all client state is cleared
        window.location.href = "/auth/login";
      } else {
        // Even if request fails, redirect to login
        // User will be logged out client-side anyway
        console.error("Logout request failed, redirecting anyway");
        window.location.href = "/auth/login";
      }
    } catch (error) {
      // Network error - still redirect to login
      console.error("Logout error:", error);
      window.location.href = "/auth/login";
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* User Info */}
      <div className="flex items-center gap-2">
        {/* User Avatar Icon */}
        <div
          className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-5"
          >
            <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
          </svg>
        </div>

        {/* User Email */}
        <span className="text-sm text-muted-foreground" title={userEmail}>
          {truncateEmail(userEmail)}
        </span>
      </div>

      {/* Logout Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleLogout}
        disabled={isLoggingOut}
        aria-label="Wyloguj się"
      >
        {isLoggingOut ? (
          <>
            <svg
              className="mr-2 size-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Wylogowywanie...
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="mr-2 size-4"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z"
                clipRule="evenodd"
              />
              <path
                fillRule="evenodd"
                d="M6 10a.75.75 0 01.75-.75h9.546l-1.048-.943a.75.75 0 111.004-1.114l2.5 2.25a.75.75 0 010 1.114l-2.5 2.25a.75.75 0 11-1.004-1.114l1.048-.943H6.75A.75.75 0 016 10z"
                clipRule="evenodd"
              />
            </svg>
            Wyloguj się
          </>
        )}
      </Button>
    </div>
  );
}
