import { describe, expect, test } from "bun:test";
import {
  STORAGE_KEY, createThreadInfo, parseStoredThreads, readStoredThreads, writeStoredThreads,
} from "./thread-storage";

function fakeStorage(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    store,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
  };
}

describe("thread storage", () => {
  test("creates a pending thread with defaults and a 48-character title", () => {
    expect(createThreadInfo("thread-1")).toEqual({
      id: "thread-1", title: "Conversation",
      updatedAt: "À l’instant", group: "Aujourd’hui",
    });

    const longTitle = "x".repeat(80);
    const info = createThreadInfo("thread-2", longTitle);
    expect(info.title).toHaveLength(48);
    expect(info.title).toBe(longTitle.slice(0, 48));
    expect(createThreadInfo("thread-3", "  ").title).toBe("  ");
  });

  test("parses only the stored envelope with string ids and titles", () => {
    const threads = [createThreadInfo("thread-1", "Inflation")];
    expect(parseStoredThreads({ threads, activeId: "thread-1" })).toEqual(threads);
    expect(parseStoredThreads({ threads, activeId: null })).toEqual(threads);

    expect(parseStoredThreads(null)).toEqual([]);
    expect(parseStoredThreads("stored")).toEqual([]);
    expect(parseStoredThreads({ threads })).toEqual([]);
    expect(parseStoredThreads({ threads, activeId: "thread-1" })).toEqual(threads);
    expect(parseStoredThreads({ threads: "nope", activeId: "thread-1" })).toEqual([]);
    expect(parseStoredThreads({ threads: [{ id: "thread-1" }], activeId: "thread-1" })).toEqual([]);
    expect(parseStoredThreads({ threads: [{ id: 1, title: "x" }], activeId: "thread-1" })).toEqual([]);
    expect(parseStoredThreads({ threads: [null], activeId: "thread-1" })).toEqual([]);
  });

  test("reads and writes through an injected storage under the retained key", () => {
    const storage = fakeStorage();
    const threads = [createThreadInfo("thread-1", "Inflation")];

    writeStoredThreads(threads, "thread-1", storage);

    expect(STORAGE_KEY).toBe("brh:assistant:threads:v1");
    expect(JSON.parse(storage.store.get(STORAGE_KEY)!)).toEqual({
      threads, activeId: "thread-1",
    });
    expect(readStoredThreads(storage)).toEqual(threads);
  });

  test("treats absent or corrupted storage as empty", () => {
    expect(readStoredThreads(fakeStorage())).toEqual([]);
    expect(readStoredThreads(fakeStorage({ [STORAGE_KEY]: "{" }))).toEqual([]);
    expect(readStoredThreads(fakeStorage({ [STORAGE_KEY]: '{"threads":[]}' }))).toEqual([]);
  });
});
