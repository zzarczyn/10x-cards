/**
 * Unit tests for Auth Validation Service
 */

import { describe, it, expect } from "vitest";
import { validateEmail, validatePassword, validateLoginInput, validateRegisterInput } from "./auth-validation.service";

describe("auth-validation.service", () => {
  describe("validateEmail", () => {
    it("should accept valid email addresses", () => {
      const validEmails = ["test@example.com", "user.name@domain.co.uk", "first+last@test.io"];

      validEmails.forEach((email) => {
        const result = validateEmail(email);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid email addresses", () => {
      const invalidEmails = ["invalid", "@example.com", "test@", "test @example.com", ""];

      invalidEmails.forEach((email) => {
        const result = validateEmail(email);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("validatePassword", () => {
    it("should accept passwords with minimum length", () => {
      const result = validatePassword("Password123!");
      expect(result.success).toBe(true);
    });

    it("should reject passwords that are too short", () => {
      const result = validatePassword("Pass1!");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("minimum");
      }
    });

    it("should reject empty passwords", () => {
      const result = validatePassword("");
      expect(result.success).toBe(false);
    });
  });

  describe("validateLoginInput", () => {
    it("should validate correct login credentials", () => {
      const result = validateLoginInput({
        email: "test@example.com",
        password: "SecurePass123!",
      });
      expect(result.success).toBe(true);
    });

    it("should reject login with invalid email", () => {
      const result = validateLoginInput({
        email: "invalid-email",
        password: "SecurePass123!",
      });
      expect(result.success).toBe(false);
    });

    it("should reject login with invalid password", () => {
      const result = validateLoginInput({
        email: "test@example.com",
        password: "short",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("validateRegisterInput", () => {
    it("should validate correct registration data", () => {
      const result = validateRegisterInput({
        email: "newuser@example.com",
        password: "SecurePass123!",
        confirmPassword: "SecurePass123!",
      });
      expect(result.success).toBe(true);
    });

    it("should reject when passwords do not match", () => {
      const result = validateRegisterInput({
        email: "newuser@example.com",
        password: "SecurePass123!",
        confirmPassword: "DifferentPass123!",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("identyczne");
      }
    });

    it("should reject registration with invalid email", () => {
      const result = validateRegisterInput({
        email: "invalid",
        password: "SecurePass123!",
        confirmPassword: "SecurePass123!",
      });
      expect(result.success).toBe(false);
    });
  });
});
