import { expect, test } from "bun:test";
import { threadIdFromPath, threadPath, threadShareUrl } from "./thread-path";

test("thread URLs round-trip and the assistant root starts a new conversation", () => {
  const id = "12345678-1234-1234-1234-123456789abc";
  expect(threadPath(id)).toBe(`/assistant/${id}`);
  expect(threadIdFromPath(threadPath(id))).toBe(id);
  expect(threadIdFromPath("/assistant")).toBeNull();
  expect(threadIdFromPath("/assistant/not-an-id")).toBeNull();
});

test("share URLs are absolute and keep ids encoded", () => {
  const id = "12345678-1234-1234-1234-123456789abc";
  expect(threadShareUrl(id, "https://brh.example")).toBe(
    `https://brh.example/assistant/${id}`,
  );
  expect(threadShareUrl("a/b", "https://brh.example/")).toBe(
    "https://brh.example/assistant/a%2Fb",
  );
});
