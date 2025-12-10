import { useState } from "react";
import { Button } from "../ui/button";

interface UserMenuProps {
  userEmail: string;
}

/**
 * User menu component
 * Displays logged-in user information and logout button
 *
 * Features:
 * - User email display (truncated if too long)
 * - Dropdown menu with logout option
 * - Accessible keyboard navigation
 */
export function UserMenu({ userEmail }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    // TODO: Call API endpoint when backend is ready
    setTimeout(() => {
      // window.location.href = '/auth/login';
      // TODO: Backend - uncomment redirect above
      setIsLoggingOut(false);
    }, 1000);

    /* Future implementation:
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        window.location.href = '/auth/login';
      } else {
        console.error('Logout failed');
        setIsLoggingOut(false);
      }
    } catch (err) {
      console.error('Logout error:', err);
      setIsLoggingOut(false);
    }
    */
  };

  // Truncate email if too long
  const displayEmail = userEmail.length > 25 ? `${userEmail.substring(0, 22)}...` : userEmail;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar placeholder */}
        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
          <svg
            className="size-5 text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>

        {/* Email */}
        <div className="hidden sm:flex flex-col items-start">
          <span className="text-sm font-medium">{displayEmail}</span>
        </div>

        {/* Chevron icon */}
        <svg
          className={`size-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          {/* Backdrop for closing menu */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} aria-hidden="true" />

          {/* Menu content */}
          <div
            className="absolute right-0 mt-2 w-56 rounded-md border bg-card shadow-lg z-20"
            role="menu"
            aria-orientation="vertical"
          >
            <div className="p-2">
              {/* User info on mobile */}
              <div className="sm:hidden px-3 py-2 mb-2 border-b">
                <p className="text-sm font-medium">{userEmail}</p>
              </div>

              {/* Logout button */}
              <Button
                onClick={handleLogout}
                disabled={isLoggingOut}
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                role="menuitem"
              >
                {isLoggingOut ? (
                  <>
                    <svg
                      className="animate-spin size-4"
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
                      className="size-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Wyloguj się
                  </>
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
