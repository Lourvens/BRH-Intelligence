import { describe, expect, test } from "bun:test";

import { citationCountLabel } from "./citations";

describe("citationCountLabel", () => {
  test("keeps the empty state and plural agreement in one place", () => {
    expect(citationCountLabel(0)).toBe("Aucune référence");
    expect(citationCountLabel(1)).toBe("1 référence active");
    expect(citationCountLabel(2)).toBe("2 références actives");
  });
});
