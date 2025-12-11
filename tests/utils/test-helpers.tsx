/**
 * Test Utility Helpers
 * Reusable functions for testing
 */

import { render, RenderOptions } from "@testing-library/react";
import { ReactElement, ReactNode } from "react";

// Custom render function that wraps components with providers if needed
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  // Add custom options here if needed (e.g., initial state, providers)
}

export function renderWithProviders(ui: ReactElement, options?: CustomRenderOptions) {
  function Wrapper({ children }: { children: ReactNode }) {
    // Add any context providers here
    return <>{children}</>;
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

// Re-export everything from testing library
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
