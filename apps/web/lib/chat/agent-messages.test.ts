import { describe, expect, test } from "bun:test";
import type { Message } from "@langchain/langgraph-sdk";
import { agentMessagesToChatMessages } from "./agent-messages";

describe("published agent messages", () => {
  test("hides unvalidated model output and preserves page citations after reload", () => {
    const messages: Message[] = [
      { id: "u1", type: "human", content: "Inflation ?" },
      { id: "draft", type: "ai", content: "internal draft" },
      { id: "answer", type: "ai", content: "Le taux est documenté. [1](#brh-source-1)",
        additional_kwargs: { brh: { version: 1, kind: "answer", validated: true, citations: [{
          document_id: "d1", slug: "note", title: "Note BRH", page_number: 3,
          snippet: "Extrait", score: 0.9, pdf_url: "https://brh.ht/note.pdf#page=3",
        }] } } },
    ];
    const restored = agentMessagesToChatMessages(JSON.parse(JSON.stringify(messages)));
    expect(restored.map((message) => message.id)).toEqual(["u1", "answer"]);
    expect(restored[1].citations?.[0]).toMatchObject({ id: "d1:3", page: 3, title: "Note BRH" });
    expect(restored[1].content).toContain("#brh-source-1");
  });

  test("social messages carry no citations", () => {
    const mapped = agentMessagesToChatMessages([{ type: "ai", content: "Hi!", additional_kwargs: {
      brh: { version: 1, kind: "conversation", validated: true, citations: [] },
    } }]);
    expect(mapped[0].citations).toEqual([]);
  });
});
