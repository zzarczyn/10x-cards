/**
 * Maps Supabase Auth errors to user-friendly Polish messages
 *
 * @param error - Error object from Supabase Auth
 * @returns User-friendly error message in Polish
 */
export function mapSupabaseAuthError(error: unknown): string {
  if (!error || typeof error !== "object" || !("message" in error)) {
    return "Wystąpił nieoczekiwany błąd";
  }

  const message = String(error.message).toLowerCase();

  // Login errors
  if (message.includes("invalid login credentials")) {
    return "Nieprawidłowy email lub hasło";
  }

  if (message.includes("email not confirmed")) {
    return "Potwierdź swój email przed zalogowaniem";
  }

  if (message.includes("user not found")) {
    return "Nieprawidłowy email lub hasło";
  }

  // Signup errors
  if (message.includes("already registered") || message.includes("user already registered")) {
    return "Ten adres email jest już zarejestrowany";
  }

  if (message.includes("password") && message.includes("weak")) {
    return "Hasło jest zbyt słabe. Użyj minimum 8 znaków i jednej cyfry.";
  }

  if (message.includes("invalid email")) {
    return "Podaj prawidłowy adres email";
  }

  // Session errors
  if (message.includes("jwt expired") || message.includes("token expired")) {
    return "Sesja wygasła. Zaloguj się ponownie.";
  }

  if (message.includes("jwt") && message.includes("malformed")) {
    return "Nieprawidłowa sesja. Zaloguj się ponownie.";
  }

  if (message.includes("refresh token") && message.includes("expired")) {
    return "Sesja wygasła. Zaloguj się ponownie.";
  }

  // Network/Server errors
  if (message.includes("network") || message.includes("fetch")) {
    return "Brak połączenia z internetem";
  }

  if (message.includes("timeout")) {
    return "Przekroczono czas oczekiwania. Spróbuj ponownie.";
  }

  // Default fallback
  return "Wystąpił błąd. Spróbuj ponownie później.";
}
