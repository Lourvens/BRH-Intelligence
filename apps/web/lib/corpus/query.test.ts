import { describe, expect, test } from "bun:test";
import { applySearchChanges, corpusLink, isBlankFilter } from "./query";

const current = () =>
  new URLSearchParams("q=inflation&family=circular&page=3&sort=recent");

describe("applySearchChanges", () => {
  test("drops the page and preserves unrelated parameters", () => {
    const next = applySearchChanges(
      current(),
      { family: "inflation" },
      { dropPage: true },
    );
    expect(next.get("page")).toBeNull();
    expect(next.get("q")).toBe("inflation");
    expect(next.get("sort")).toBe("recent");
    expect(next.get("family")).toBe("inflation");
  });
  test("drops blank and all values when asked", () => {
    const next = applySearchChanges(
      current(),
      { family: "all", year: "" },
      { dropPage: true, dropBlank: true },
    );
    expect(next.get("family")).toBeNull();
    expect(next.get("year")).toBeNull();
    expect(next.get("page")).toBeNull();
    expect(next.toString()).toBe("q=inflation&sort=recent");
  });
  test("deletes null and undefined changes and accepts numbers", () => {
    const next = applySearchChanges(current(), {
      family: null,
      kind: undefined,
      page: 2,
    });
    expect(next.get("family")).toBeNull();
    expect(next.get("kind")).toBeNull();
    expect(next.get("page")).toBe("2");
  });
  test("does not mutate the input parameters", () => {
    const input = current();
    applySearchChanges(
      input,
      { family: "study" },
      { dropPage: true, dropBlank: true },
    );
    expect(input.toString()).toBe(
      "q=inflation&family=circular&page=3&sort=recent",
    );
  });
  test("treats missing, empty and all as blank filters", () => {
    expect(isBlankFilter(null)).toBe(true);
    expect(isBlankFilter(undefined)).toBe(true);
    expect(isBlankFilter("")).toBe(true);
    expect(isBlankFilter("all")).toBe(true);
    expect(isBlankFilter("circular")).toBe(false);
  });
});

describe("corpusLink", () => {
  test("still builds catalogue links with changed parameters", () => {
    expect(corpusLink({ q: "x" }, { family: "study", page: 2 })).toBe(
      "/brh-corpus?q=x&family=study&page=2",
    );
    expect(corpusLink({ q: "x", family: "study" }, { family: null })).toBe(
      "/brh-corpus?q=x",
    );
  });
});
