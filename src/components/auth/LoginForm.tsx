import { useState, type FormEvent } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface LoginFormState {
  email: string;
  password: string;
  isLoading: boolean;
  error: string | null;
  validationErrors: {
    email?: string;
    password?: string;
  };
}

/**
 * Login form component
 * Handles user authentication with client-side validation
 *
 * Features:
 * - Email and password validation
 * - Loading state during submission
 * - Error display (validation and server errors)
 * - Links to register and forgot password pages
 */
export function LoginForm() {
  const [formState, setFormState] = useState<LoginFormState>({
    email: "",
    password: "",
    isLoading: false,
    error: null,
    validationErrors: {},
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

  const validatePassword = (password: string): string | undefined => {
    if (!password) {
      return "Hasło jest wymagane";
    }
    if (password.length < 6) {
      return "Hasło musi mieć minimum 6 znaków";
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const emailError = validateEmail(formState.email);
    const passwordError = validatePassword(formState.password);

    setFormState((prev) => ({
      ...prev,
      validationErrors: {
        email: emailError,
        password: passwordError,
      },
    }));

    return !emailError && !passwordError;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setFormState((prev) => ({ ...prev, error: null }));

    // Validate form
    if (!validateForm()) {
      return;
    }

    setFormState((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formState.email,
          password: formState.password,
        }),
      });

      if (response.ok) {
        // Success: force page reload to update auth state
        window.location.href = "/";
      } else {
        const errorData = await response.json();
        setFormState((prev) => ({
          ...prev,
          error: errorData.message || "Błąd logowania",
          isLoading: false,
        }));
      }
    } catch (err) {
      setFormState((prev) => ({
        ...prev,
        error: "Wystąpił błąd połączenia. Spróbuj ponownie.",
        isLoading: false,
      }));
    }
  };

  const handleEmailChange = (value: string) => {
    setFormState((prev) => ({
      ...prev,
      email: value,
      validationErrors: { ...prev.validationErrors, email: undefined },
    }));
  };

  const handlePasswordChange = (value: string) => {
    setFormState((prev) => ({
      ...prev,
      password: value,
      validationErrors: { ...prev.validationErrors, password: undefined },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Zaloguj się</h2>
        <p className="text-sm text-muted-foreground">Wprowadź swoje dane, aby uzyskać dostęp do konta</p>
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
            onChange={(e) => handleEmailChange(e.target.value)}
            disabled={formState.isLoading}
            placeholder="twoj@email.pl"
            aria-invalid={!!formState.validationErrors.email}
            aria-describedby={formState.validationErrors.email ? "email-error" : undefined}
          />
          {formState.validationErrors.email && (
            <p id="email-error" className="text-sm text-destructive">
              {formState.validationErrors.email}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Hasło
          </label>
          <Input
            id="password"
            type="password"
            value={formState.password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            disabled={formState.isLoading}
            placeholder="••••••••"
            aria-invalid={!!formState.validationErrors.password}
            aria-describedby={formState.validationErrors.password ? "password-error" : undefined}
          />
          {formState.validationErrors.password && (
            <p id="password-error" className="text-sm text-destructive">
              {formState.validationErrors.password}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end">
          <a href="/auth/forgot-password" className="text-sm text-primary hover:underline">
            Zapomniałeś hasła?
          </a>
        </div>

        <Button type="submit" disabled={formState.isLoading} className="w-full" size="lg">
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
              Logowanie...
            </>
          ) : (
            "Zaloguj się"
          )}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Nie masz konta? </span>
        <a href="/auth/register" className="text-primary hover:underline">
          Zarejestruj się
        </a>
      </div>
    </div>
  );
}
