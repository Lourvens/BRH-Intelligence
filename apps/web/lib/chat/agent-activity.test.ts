import { describe, expect, test } from "bun:test";
import { mergeActivity, parseActivity, type AgentActivity } from "./agent-activity";

const start: AgentActivity = { type: "brh.activity", turn_id: "t1", id: "search:1", stage: "search", status: "running", query: "inflation" };

describe("agent activity stream", () => {
  test("merges parallel searches without losing their results", () => {
    let events = mergeActivity([], start);
    events = mergeActivity(events, { ...start, id: "search:2", query: "réserves" });
    events = mergeActivity(events, { ...start, status: "complete", result_count: 2 });
    expect(events).toHaveLength(2);
    expect(events[0].result_count).toBe(2);
    expect(events[1].status).toBe("running");
  });
  test("ignores another turn and replayed start events", () => {
    const complete = { ...start, status: "complete" as const };
    expect(mergeActivity([complete], start)).toEqual([complete]);
    expect(mergeActivity([complete], { ...start, turn_id: "old" })).toEqual([complete]);
  });
  test("accepts only known activity data and discards drafts or reasoning", () => {
    expect(parseActivity({ ...start, reasoning: "private", draft: "unvalidated" })).toEqual(start);
    expect(parseActivity({ ...start, stage: "unknown" })).toBeNull();
    expect(parseActivity({ type: "tokens", text: "draft" })).toBeNull();
    expect(parseActivity({ ...start, sources: [{ title: "Rapport", page: "wrong" }] })?.sources).toEqual([]);
  });
});
