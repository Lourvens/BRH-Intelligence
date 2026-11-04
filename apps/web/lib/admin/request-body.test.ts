import { describe, expect, test } from "bun:test";
import { BodyTooLargeError, boundedBody } from "./request-body";

describe("bounded request bodies", () => {
  test("decodes multibyte text across streamed chunks", async () => {
    const bytes = new TextEncoder().encode("Haïti");
    const body = new ReadableStream({ start(controller) {
      controller.enqueue(bytes.slice(0, 3));
      controller.enqueue(bytes.slice(3));
      controller.close();
    } });
    const request = new Request("https://brh.test", { method: "POST", body, duplex: "half" } as RequestInit);
    expect(await boundedBody(request, bytes.length)).toBe("Haïti");
  });
  test("rejects oversized streams even without content-length", async () => {
    const request = new Request("https://brh.test", { method: "POST", body: "é".repeat(100) });
    await expect(boundedBody(request, 150)).rejects.toBeInstanceOf(BodyTooLargeError);
  });
  test("rejects excessive declared lengths before reading", async () => {
    const request = new Request("https://brh.test", { method: "POST", body: "x", headers: { "content-length": "10000" } });
    await expect(boundedBody(request, 100)).rejects.toBeInstanceOf(BodyTooLargeError);
  });
});
