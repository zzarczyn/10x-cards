import { useState, type FormEvent } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface ForgotPasswordFormState {
  email: string;
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
}

/**
 * Forgot password form component
 * Allows users to request a password reset link via email
 *
 * Features:
 * - Email validation
 * - Always shows success message (security best practice)
 * - Clear instructions for next steps
 */
export function ForgotPasswordForm() {
  const [formState, setFormState] = useState<ForgotPasswordFormState>({
    email: "",
    isLoading: false,
    isSuccess: false,
    error: null,
  });

  const validateEmail = (email: string): string | undefined => {
    if (!email) {
      return "Email jest wymagany";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Podaj prawidłowy adres email";
    }
    return undefined;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setFormState((prev) => ({ ...prev, error: null }));

    // Validate email
    const emailError = validateEmail(formState.email);
    if (emailError) {
      setFormState((prev) => ({ ...prev, error: emailError }));
      return;
    }

    setFormState((prev) => ({ ...prev, isLoading: true }));

    // TODO: Call API endpoint when backend is ready
    // Always show success (security best practice - don't reveal if email exists)
    setTimeout(() => {
      setFormState((prev) => ({
        ...prev,
        isLoading: false,
        isSuccess: true,
      }));
    }, 1000);

    /* Future implementation:
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formState.email }),
      });

      // Always show success (security - don't reveal if email exists)
      setFormState(prev => ({
        ...prev,
        isSuccess: true,
        isLoading: false,
      }));
    } catch (err) {
      // Even on error, show success message for security
      setFormState(prev => ({
        ...prev,
        isSuccess: true,
        isLoading: false,
      }));
    }
    */
  };

  if (formState.isSuccess) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <svg
              className="size-8 text-primary"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Sprawdź swoją skrzynkę</h2>
          <p className="text-sm text-muted-foreground">
            Jeśli konto z tym adresem email istnieje, otrzymasz wiadomość z linkiem do zresetowania hasła.
          </p>
          <p className="text-xs text-muted-foreground mt-4">Link będzie ważny przez 1 godzinę.</p>
        </div>

        <div className="text-center">
          <a href="/auth/login" className="text-sm text-primary hover:underline">
            Wróć do logowania
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Zapomniałeś hasła?</h2>
        <p className="text-sm text-muted-foreground">Podaj swój adres email, a wyślemy Ci link do zresetowania hasła</p>
      </div>

      {formState.error && (
        <div
          className="rounded-md bg-destructive/15 px-4 py-3 text-sm text-destructive"
          role="alert"
          aria-live="polite"
        >
          {formState.error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={formState.email}
            onChange={(e) => setFormState((prev) => ({ ...prev, email: e.target.value, error: null }))}
            disabled={formState.isLoading}
            placeholder="twoj@email.pl"
            aria-invalid={!!formState.error}
          />
        </div>

        <Button type="submit" disabled={formState.isLoading || !formState.email} className="w-full" size="lg">
          {formState.isLoading ? (
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
              Wysyłanie...
            </>
          ) : (
            "Wyślij link resetujący"
          )}
        </Button>
      </form>

      <div className="text-center text-sm">
        <a href="/auth/login" className="text-primary hover:underline">
          Wróć do logowania
        </a>
      </div>
    </div>
  );
}
