import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;
export const ADMIN_COOKIE_NAME = "brh-admin";

export function constantTimeEqual(value: string, expected: string): boolean {
  return timingSafeEqual(createHash("sha256").update(value).digest(), createHash("sha256").update(expected).digest());
}

export function credentialVersion(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

export function feedbackIdentity(request: Request, secret: string): string {
  // Trust address headers only behind a host that overwrites them.
  const address = process.env.BRH_WEB_TRUST_PROXY === "true"
    ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    : "untrusted";
  return createHmac("sha256", secret).update(`feedback:${address}`).digest("hex");
}
