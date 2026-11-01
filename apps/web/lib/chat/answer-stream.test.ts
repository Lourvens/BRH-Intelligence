import { expect, test } from "bun:test";
import { appendAnswerDelta, parseAnswerDelta } from "./answer-stream";

test("assembles only deltas for the current turn", () => {
  const first = parseAnswerDelta({ type: "brh.answer.delta", turn_id: "one", text: "Bon" });
  expect(first).not.toBeNull();
  const next = appendAnswerDelta(first, { turnId: "one", text: "jour" });
  expect(next.text).toBe("Bonjour");
  expect(appendAnswerDelta(next, { turnId: "old", text: "stale" })).toEqual(next);
});

test("ignores malformed and unrelated events", () => {
  expect(parseAnswerDelta({ type: "brh.activity", turn_id: "one", text: "a" })).toBeNull();
  expect(parseAnswerDelta({ type: "brh.answer.delta", turn_id: "one", text: 1 })).toBeNull();
  expect(parseAnswerDelta(null)).toBeNull();
});
