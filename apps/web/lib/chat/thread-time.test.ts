import { expect, test } from "bun:test";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { threadTimestamp, threadTimestampTitle } from "./thread-time";

const NOW = new Date(2026, 10, 3, 14, 5);

test("formats recent thread activity compactly in French", () => {
  expect(threadTimestamp(NOW.toISOString(), NOW)).toBe("à l’instant");
  expect(threadTimestamp(new Date(2026, 10, 3, 14, 4, 30).toISOString(), NOW)).toBe("à l’instant");
  expect(threadTimestamp(new Date(2026, 10, 3, 13, 55).toISOString(), NOW)).toBe("il y a 10 min");
  expect(threadTimestamp(new Date(2026, 10, 3, 11, 5).toISOString(), NOW)).toBe("il y a 3 h");
});

test("formats yesterday, weekday and calendar dates", () => {
  expect(threadTimestamp(new Date(2026, 10, 2, 16, 0).toISOString(), NOW)).toBe("hier");
  const weekday = new Date(2026, 9, 30, 9, 0);
  expect(threadTimestamp(weekday.toISOString(), NOW)).toBe(format(weekday, "EEEE", { locale: fr }));
  expect(threadTimestamp(new Date(2026, 0, 15, 9, 0).toISOString(), NOW)).toBe(
    format(new Date(2026, 0, 15, 9, 0), "d MMM", { locale: fr }),
  );
  expect(threadTimestamp(new Date(2025, 0, 15, 9, 0).toISOString(), NOW)).toBe(
    format(new Date(2025, 0, 15, 9, 0), "d MMM yyyy", { locale: fr }),
  );
});

test("provides a full accessible date and handles invalid values", () => {
  expect(threadTimestampTitle(new Date(2026, 10, 3, 14, 5).toISOString())).toBe(
    "mardi 3 novembre 2026 à 14:05",
  );
  expect(threadTimestamp("not-a-date", NOW)).toBe("Date inconnue");
  expect(threadTimestampTitle("not-a-date")).toBe("Date inconnue");
});
