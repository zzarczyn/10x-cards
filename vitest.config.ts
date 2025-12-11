import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Configure jsdom for DOM testing (React components)
    environment: "jsdom",

    // Setup files for global test configuration
    setupFiles: ["./tests/setup/vitest.setup.ts"],

    // Global test utilities
    globals: true,

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: ["node_modules/", "dist/", "**/*.d.ts", "**/*.config.*", "**/mockData/**", "tests/", ".astro/"],
      thresholds: {
        // Target: 80% for services, 70% for components
        statements: 70,
        branches: 65,
        functions: 70,
        lines: 70,
      },
    },

    // Test file patterns
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["node_modules", "dist", ".astro", "e2e"],

    // Watch mode exclusions
    watchExclude: ["**/node_modules/**", "**/dist/**"],

    // Timeout configuration
    testTimeout: 10000,
    hookTimeout: 10000,
  },

  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
