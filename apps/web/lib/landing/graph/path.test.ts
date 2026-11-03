import { describe, expect, test } from "bun:test";

import { graphPath } from "./path";

describe("graphPath", () => {
  test("finds the direct Socabank → BNC proposed relation", () => {
    expect(
      graphPath("ent-socabank", "ent-bnc", {
        maxHops: 4,
        status: ["documented", "proposed"],
      }),
    ).toEqual({
      nodeIds: ["ent-socabank", "ent-bnc"],
      edgeIds: ["e-socabank-part-of-bnc"],
    });
  });

  test("excludes proposed edges when the status filter allows only documented ones", () => {
    expect(
      graphPath("ent-socabank", "ent-bnc", {
        maxHops: 1,
        status: ["documented"],
      }),
    ).toBeNull();
    expect(
      graphPath("ent-socabank", "ent-bnc", {
        maxHops: 4,
        status: ["documented"],
      }),
    ).toEqual({
      nodeIds: ["ent-socabank", "doc-bulletin-97", "ent-bnc"],
      edgeIds: ["e-bulletin-socabank", "e-bulletin-bnc"],
    });
  });

  test("returns null for unknown endpoints", () => {
    expect(graphPath("ent-inconnu", "ent-bnc")).toBeNull();
    expect(graphPath("ent-bnc", "ent-inconnu")).toBeNull();
  });

  test("returns the node itself for a same-node path", () => {
    expect(graphPath("ent-brh", "ent-brh")).toEqual({
      nodeIds: ["ent-brh"],
      edgeIds: [],
    });
  });
});
