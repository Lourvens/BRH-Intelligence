import { describe, expect, test } from "bun:test";
import { adminDate, adminNumber } from "./format";

describe("admin display formatting", () => {
  test("uses the UTC day across timezone boundaries", () => {
    expect(adminDate("2026-11-04T23:30:00-05:00")).toBe(
      "05 nov. 2026, 04:30 UTC",
    );
    expect(adminDate("2026-11-04", "dd MMM")).toBe("04 nov.");
  });
  test("does not invent zero for missing operational data", () => {
    expect(adminNumber(null)).toBe("Indisponible");
    expect(adminNumber(0)).toBe("0");
    expect(adminDate(null)).toBe("Indisponible");
    expect(adminDate("invalid")).toBe("Date inconnue");
  });
});
