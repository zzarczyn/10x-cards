import { useState, type FormEvent } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface RegisterFormState {
  email: string;
  password: string;
  confirmPassword: string;
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
  validationErrors: {
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
}

/**
 * Registration form component
 * Handles new user account creation with comprehensive validation
 *
 * Features:
 * - Email validation
 * - Strong password requirements (min 8 chars, 1 digit)
 * - Password confirmation matching
 * - Success message before redirect
 * - Visual password strength indicator
 */
export function RegisterForm() {
  const [formState, setFormState] = useState<RegisterFormState>({
    email: "",
    password: "",
    confirmPassword: "",
    isLoading: false,
    isSuccess: false,
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
    if (password.length < 8) {
      return "Hasło musi mieć minimum 8 znaków";
    }
    if (!/\d/.test(password)) {
      return "Hasło musi zawierać przynajmniej jedną cyfrę";
    }
    return undefined;
  };

  const validateConfirmPassword = (confirmPassword: string, password: string): string | undefined => {
    if (!confirmPassword) {
      return "Potwierdzenie hasła jest wymagane";
    }
    if (confirmPassword !== password) {
      return "Hasła muszą być identyczne";
    }
    return undefined;
  };

  const calculatePasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 12.5;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 12.5;
    return Math.min(strength, 100);
  };

  const validateForm = (): boolean => {
    const emailError = validateEmail(formState.email);
    const passwordError = validatePassword(formState.password);
    const confirmPasswordError = validateConfirmPassword(formState.confirmPassword, formState.password);

    setFormState((prev) => ({
      ...prev,
      validationErrors: {
        email: emailError,
        password: passwordError,
        confirmPassword: confirmPasswordError,
      },
    }));

    return !emailError && !passwordError && !confirmPasswordError;
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

    // TODO: Call API endpoint when backend is ready
    // For now, just simulate success
    setTimeout(() => {
      setFormState((prev) => ({
        ...prev,
        isLoading: false,
        isSuccess: true,
      }));

      // Simulate redirect after showing success message
      setTimeout(() => {
        // window.location.href = '/auth/login?message=registered';
        // TODO: Backend - uncomment redirect above
      }, 3000);
    }, 1000);

    /* Future implementation:
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formState.email, 
          password: formState.password 
        }),
      });

      if (response.ok) {
        setFormState(prev => ({ ...prev, isSuccess: true, isLoading: false }));
        setTimeout(() => {
          window.location.href = '/auth/login?message=registered';
        }, 3000);
      } else {
        const errorData = await response.json();
        setFormState(prev => ({
          ...prev,
          error: errorData.message || 'Błąd rejestracji',
          isLoading: false,
        }));
      }
    } catch (err) {
      setFormState(prev => ({
        ...prev,
        error: 'Wystąpił błąd połączenia. Spróbuj ponownie.',
        isLoading: false,
      }));
    }
    */
  };

  const passwordStrength = calculatePasswordStrength(formState.password);
  const getStrengthColor = (strength: number) => {
    if (strength < 40) return "bg-red-500";
    if (strength < 70) return "bg-yellow-500";
    return "bg-green-500";
  };
  const getStrengthLabel = (strength: number) => {
    if (strength < 40) return "Słabe";
    if (strength < 70) return "Średnie";
    return "Silne";
  };

  if (formState.isSuccess) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto size-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
          <svg
            className="size-8 text-green-600 dark:text-green-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Konto utworzone!</h2>
          <p className="text-sm text-muted-foreground">Sprawdź swoją skrzynkę email, aby potwierdzić adres.</p>
          <p className="text-xs text-muted-foreground">Za chwilę zostaniesz przekierowany do strony logowania...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Utwórz konto</h2>
        <p className="text-sm text-muted-foreground">Wprowadź swoje dane, aby założyć konto</p>
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
            onChange={(e) =>
              setFormState((prev) => ({
                ...prev,
                email: e.target.value,
                validationErrors: { ...prev.validationErrors, email: undefined },
              }))
            }
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
            onChange={(e) =>
              setFormState((prev) => ({
                ...prev,
                password: e.target.value,
                validationErrors: { ...prev.validationErrors, password: undefined },
              }))
            }
            disabled={formState.isLoading}
            placeholder="••••••••"
            aria-invalid={!!formState.validationErrors.password}
            aria-describedby={formState.validationErrors.password ? "password-error" : "password-strength"}
          />
          {formState.validationErrors.password && (
            <p id="password-error" className="text-sm text-destructive">
              {formState.validationErrors.password}
            </p>
          )}
          {formState.password && !formState.validationErrors.password && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Siła hasła:</span>
                <span
                  className={
                    passwordStrength < 40
                      ? "text-red-600"
                      : passwordStrength < 70
                        ? "text-yellow-600"
                        : "text-green-600"
                  }
                >
                  {getStrengthLabel(passwordStrength)}
                </span>
              </div>
              <div
                id="password-strength"
                className="w-full h-2 bg-muted rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={passwordStrength}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Siła hasła: ${getStrengthLabel(passwordStrength)}`}
              >
                <div
                  className={`h-full transition-all duration-300 ${getStrengthColor(passwordStrength)}`}
                  style={{ width: `${passwordStrength}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="confirmPassword"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Potwierdzenie hasła
          </label>
          <Input
            id="confirmPassword"
            type="password"
            value={formState.confirmPassword}
            onChange={(e) =>
              setFormState((prev) => ({
                ...prev,
                confirmPassword: e.target.value,
                validationErrors: { ...prev.validationErrors, confirmPassword: undefined },
              }))
            }
            disabled={formState.isLoading}
            placeholder="••••••••"
            aria-invalid={!!formState.validationErrors.confirmPassword}
            aria-describedby={formState.validationErrors.confirmPassword ? "confirm-password-error" : undefined}
          />
          {formState.validationErrors.confirmPassword && (
            <p id="confirm-password-error" className="text-sm text-destructive">
              {formState.validationErrors.confirmPassword}
            </p>
          )}
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
              Tworzenie konta...
            </>
          ) : (
            "Zarejestruj się"
          )}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Masz już konto? </span>
        <a href="/auth/login" className="text-primary hover:underline">
          Zaloguj się
        </a>
      </div>
    </div>
  );
}
