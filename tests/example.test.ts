/**
 * Example Unit Test
 * Demonstrates basic Vitest usage and best practices
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateMockFlashcard } from "./utils/faker-setup";

describe("Example Test Suite", () => {
  describe("Basic assertions", () => {
    it("should perform basic equality checks", () => {
      expect(1 + 1).toBe(2);
      expect("hello").toBe("hello");
      expect(true).toBe(true);
    });

    it("should check object equality", () => {
      const obj = { name: "Test", value: 42 };
      expect(obj).toEqual({ name: "Test", value: 42 });
    });

    it("should check array inclusion", () => {
      const arr = [1, 2, 3, 4, 5];
      expect(arr).toContain(3);
      expect(arr).toHaveLength(5);
    });
  });

  describe("Mocking with vi", () => {
    it("should mock functions with vi.fn()", () => {
      const mockFn = vi.fn();
      mockFn("test");

      expect(mockFn).toHaveBeenCalledWith("test");
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("should mock return values", () => {
      const mockFn = vi.fn().mockReturnValue(42);

      const result = mockFn();
      expect(result).toBe(42);
    });

    it("should spy on existing objects", () => {
      const obj = {
        method: (x: number) => x * 2,
      };

      const spy = vi.spyOn(obj, "method");
      obj.method(5);

      expect(spy).toHaveBeenCalledWith(5);
      expect(spy).toHaveReturnedWith(10);
    });
  });

  describe("Async tests", () => {
    it("should handle promises", async () => {
      const asyncFn = async () => {
        return "resolved";
      };

      await expect(asyncFn()).resolves.toBe("resolved");
    });

    it("should handle promise rejections", async () => {
      const asyncFn = async () => {
        throw new Error("Test error");
      };

      await expect(asyncFn()).rejects.toThrow("Test error");
    });
  });

  describe("Using Faker for test data", () => {
    it("should generate mock flashcard data", () => {
      const flashcard = generateMockFlashcard();

      expect(flashcard).toHaveProperty("id");
      expect(flashcard).toHaveProperty("question");
      expect(flashcard).toHaveProperty("answer");
      expect(flashcard.source).toMatch(/^(ai-full|ai-edited|manual)$/);
    });

    it("should generate different data on each call", () => {
      const flashcard1 = generateMockFlashcard();
      const flashcard2 = generateMockFlashcard();

      expect(flashcard1.id).not.toBe(flashcard2.id);
      expect(flashcard1.question).not.toBe(flashcard2.question);
    });

    it("should allow overriding generated data", () => {
      const flashcard = generateMockFlashcard({
        question: "Custom question",
        source: "manual",
      });

      expect(flashcard.question).toBe("Custom question");
      expect(flashcard.source).toBe("manual");
    });
  });

  describe("Test lifecycle hooks", () => {
    let counter: number;

    beforeEach(() => {
      // Arrange: Setup before each test
      counter = 0;
    });

    it("should start with counter at 0", () => {
      expect(counter).toBe(0);
    });

    it("should increment counter", () => {
      // Act
      counter++;

      // Assert
      expect(counter).toBe(1);
    });
  });
});
