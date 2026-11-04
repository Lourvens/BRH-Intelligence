import { describe, expect, test } from "bun:test";
import { sealData, unsealData } from "iron-session";
import { constantTimeEqual, credentialVersion, feedbackIdentity, sameOrigin } from "./security";
import { allowLogin } from "./login-limit";

describe("admin security boundaries", () => {
  test("rejects cross-origin and originless mutations", () => {
    expect(sameOrigin(new Request("https://brh.test/api/admin/login", { headers: { origin: "https://evil.test" } }))).toBe(false);
    expect(sameOrigin(new Request("https://brh.test/api/admin/login"))).toBe(false);
    expect(sameOrigin(new Request("https://brh.test/api/admin/login", { headers: { origin: "https://brh.test" } }))).toBe(true);
  });
  test("credential comparisons and rotation", () => {
    expect(constantTimeEqual("correct", "correct")).toBe(true);
    expect(constantTimeEqual("", "correct")).toBe(false);
    expect(credentialVersion("old")).not.toBe(credentialVersion("new"));
  });
  test("session seals reject tampering and a different secret", async () => {
    const password = "a".repeat(32);
    const seal = await sealData({ authenticated: true }, { password, ttl: 60 });
    expect((await unsealData<{ authenticated?: boolean }>(seal, { password })).authenticated).toBe(true);
    const parts = seal.split("*");
    parts[6] = "tampered-ciphertext";
    expect((await unsealData<{ authenticated?: boolean }>(parts.join("*"), { password })).authenticated).toBeUndefined();
    expect((await unsealData<{ authenticated?: boolean }>(seal, { password: "b".repeat(32) })).authenticated).toBeUndefined();
  });
  test("login throttle rejects excess attempts and resets", () => {
    for (let i = 0; i < 8; i++) expect(allowLogin("test", 0)).toBe(true);
    expect(allowLogin("test", 1)).toBe(false);
    expect(allowLogin("test", 16 * 60 * 1000)).toBe(true);
  });
  test("submission identity is keyed and never contains the address", () => {
    const digest = feedbackIdentity(new Request("https://brh.test", { headers: { "x-forwarded-for": "192.0.2.1" } }), "secret");
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).not.toContain("192.0.2.1");
    expect(digest).not.toBe(feedbackIdentity(new Request("https://brh.test"), "another-secret"));
  });
});
