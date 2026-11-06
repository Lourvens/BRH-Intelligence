import { expect, test } from "bun:test";

import { serverThreadInfo, type AssistantThreadRecord } from "./threads";

function record(overrides: Partial<AssistantThreadRecord> = {}): AssistantThreadRecord {
  return {
    thread_id: "01a1a447-47a1-7c01-a0f3-60e854eef4f7",
    title: "Inflation haïtienne",
    created_at: "2026-11-01T12:00:00Z",
    updated_at: "2020-01-02T12:00:00Z",
    ...overrides,
  };
}

test("a stored conversation maps onto the sidebar model", () => {
  const info = serverThreadInfo(record());
  expect(info.id).toBe("01a1a447-47a1-7c01-a0f3-60e854eef4f7");
  expect(info.title).toBe("Inflation haïtienne");
  expect(info.group).toBe("Plus ancien");
  expect(info.updatedAt).toBe("2020-01-02T12:00:00.000Z");
});

test("a blank title and an invalid date never break the sidebar", () => {
  const info = serverThreadInfo(record({ title: "", updated_at: "not-a-date" }));
  expect(info.title).toBe("Conversation");
  expect(Number.isNaN(new Date(info.updatedAt).getTime())).toBe(false);
});
