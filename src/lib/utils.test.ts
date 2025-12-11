/**
 * Unit tests for utility functions
 */

import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("utils", () => {
  describe("cn (className merger)", () => {
    it("should merge class names correctly", () => {
      const result = cn("px-2", "py-1");
      expect(result).toBe("px-2 py-1");
    });

    it("should handle conditional classes", () => {
      const condition = false;
      const result = cn("base-class", condition && "conditional-class");
      expect(result).toBe("base-class");
    });

    it("should override conflicting Tailwind classes", () => {
      const result = cn("px-2", "px-4");
      // tailwind-merge should keep only the last px class
      expect(result).toBe("px-4");
    });

    it("should handle undefined and null values", () => {
      const result = cn("base-class", undefined, null, "other-class");
      expect(result).toBe("base-class other-class");
    });

    it("should handle arrays of classes", () => {
      const result = cn(["class-1", "class-2"], "class-3");
      expect(result).toBe("class-1 class-2 class-3");
    });
  });
});
