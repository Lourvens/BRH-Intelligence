import { describe, expect, test } from "bun:test";
import {
  STORAGE_KEY, createThreadInfo, parseStoredThreads, readStoredThreads,
  threadGroup, writeStoredThreads,
} from "./thread-storage";

const NOW = new Date(2026, 10, 3, 14, 5);

function fakeStorage(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    store,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
  };
}

describe("thread storage", () => {
  test("creates a pending thread with a real timestamp and a 48-character title", () => {
    expect(createThreadInfo("thread-1", undefined, NOW)).toEqual({
      id: "thread-1", title: "Conversation",
      updatedAt: NOW.toISOString(), group: "Aujourd’hui",
    });

    const longTitle = "x".repeat(80);
    const info = createThreadInfo("thread-2", longTitle, NOW);
    expect(info.title).toHaveLength(48);
    expect(info.title).toBe(longTitle.slice(0, 48));
    expect(createThreadInfo("thread-3", "  ", NOW).title).toBe("  ");
  });

  test("derives the sidebar group from the timestamp", () => {
    expect(threadGroup(NOW, NOW)).toBe("Aujourd’hui");
    expect(threadGroup(new Date(2026, 10, 2, 9, 0), NOW)).toBe("Cette semaine");
    expect(threadGroup(new Date(2026, 9, 20, 9, 0), NOW)).toBe("Plus ancien");
  });

  test("parses only the stored envelope and normalizes timestamps", () => {
    const threads = [createThreadInfo("thread-1", "Inflation", NOW)];
    expect(parseStoredThreads({ threads, activeId: "thread-1" }, NOW)).toEqual(threads);
    expect(parseStoredThreads({ threads, activeId: null }, NOW)).toEqual(threads);

    expect(parseStoredThreads(null)).toEqual([]);
    expect(parseStoredThreads("stored")).toEqual([]);
    expect(parseStoredThreads({ threads })).toEqual([]);
    expect(parseStoredThreads({ threads: "nope", activeId: "thread-1" })).toEqual([]);
    expect(parseStoredThreads({ threads: [{ id: "thread-1" }], activeId: "thread-1" })).toEqual([]);
    expect(parseStoredThreads({ threads: [{ id: 1, title: "x" }], activeId: "thread-1" })).toEqual([]);
    expect(parseStoredThreads({ threads: [null], activeId: "thread-1" })).toEqual([]);
  });

  test("migrates the old hardcoded label without dropping the conversation", () => {
    const legacy = {
      threads: [{ id: "thread-1", title: "Inflation", updatedAt: "À l’instant", group: "Aujourd’hui" }],
      activeId: "thread-1",
    };
    expect(parseStoredThreads(legacy, NOW)).toEqual([{
      id: "thread-1", title: "Inflation",
      updatedAt: NOW.toISOString(), group: "Aujourd’hui",
    }]);
  });

  test("reads and writes through an injected storage under the retained key", () => {
    const storage = fakeStorage();
    const threads = [createThreadInfo("thread-1", "Inflation", NOW)];

    writeStoredThreads(threads, "thread-1", storage);

    expect(STORAGE_KEY).toBe("brh:assistant:threads:v1");
    expect(JSON.parse(storage.store.get(STORAGE_KEY)!)).toEqual({
      threads, activeId: "thread-1",
    });
    expect(readStoredThreads(storage).map((thread) => thread.updatedAt)).toEqual([
      NOW.toISOString(),
    ]);
  });

  test("treats absent or corrupted storage as empty", () => {
    expect(readStoredThreads(fakeStorage())).toEqual([]);
    expect(readStoredThreads(fakeStorage({ [STORAGE_KEY]: "{" }))).toEqual([]);
    expect(readStoredThreads(fakeStorage({ [STORAGE_KEY]: '{"threads":[]}' }))).toEqual([]);
  });
});
