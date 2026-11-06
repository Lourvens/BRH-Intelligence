import { expect, test } from "bun:test";

import { formatRetryDelay } from "./retry-delay";

test("retry delays read naturally in French", () => {
  expect(formatRetryDelay(43200)).toBe("12 h");
  expect(formatRetryDelay(3660)).toBe("1 h 1 min");
  expect(formatRetryDelay(42)).toBe("42 s");
  expect(formatRetryDelay(0)).toBe("0 s");
});
