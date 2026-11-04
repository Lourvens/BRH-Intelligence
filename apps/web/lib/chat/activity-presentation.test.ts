import { expect, test } from "bun:test";
import { retainPublishedActivity } from "./activity-presentation";
import type { AgentActivity } from "./agent-activity";
import type { ChatMessage } from "./types";

const activity: AgentActivity = { type: "brh.activity", turn_id: "turn-1",
  id: "search-1", stage: "search", status: "complete", query: "inflation",
  sources: [{ title: "BRH", page: 3, excerpt: "28,3 %" }] };

test("publication preserves live tool details even with a sparse envelope", () => {
  const message: ChatMessage = { id: "answer-turn-1", role: "assistant", content: "Réponse",
    activities: [{ ...activity, query: undefined, sources: undefined }] };
  const result = retainPublishedActivity([message], [activity]);
  expect(result[0].activities?.[0].sources).toEqual(activity.sources);
  expect(result[0].activities?.[0].query).toBe("inflation");
});

test("a new turn does not replace a previous answer's activity", () => {
  const messages: ChatMessage[] = [{ id: "answer-old", role: "assistant", content: "Ancienne" }];
  expect(retainPublishedActivity(messages, [activity])).toBe(messages);
});
