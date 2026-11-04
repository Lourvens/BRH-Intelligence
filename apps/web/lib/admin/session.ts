import "server-only";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, ADMIN_SESSION_SECONDS, constantTimeEqual, credentialVersion } from "./security";

type AdminSession = { authenticated?: boolean; expiresAt?: number; credentialVersion?: string };

export function adminConfigured(): boolean {
  return (process.env.BRH_ADMIN_PASSWORD?.length ?? 0) >= 16
    && (process.env.BRH_ADMIN_SESSION_SECRET?.length ?? 0) >= 32
    && (process.env.BRH_ADMIN_API_TOKEN?.length ?? 0) >= 32;
}

export async function adminSession() {
  if (!adminConfigured()) throw new Error("Admin access is not configured");
  return getIronSession<AdminSession>(await cookies(), {
    cookieName: ADMIN_COOKIE_NAME,
    password: process.env.BRH_ADMIN_SESSION_SECRET!,
    ttl: ADMIN_SESSION_SECONDS,
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/" },
  });
}

export async function isAdminSession(): Promise<boolean> {
  if (!adminConfigured()) return false;
  const session = await adminSession();
  return session.authenticated === true && (session.expiresAt ?? 0) > Date.now()
    && constantTimeEqual(session.credentialVersion ?? "", credentialVersion(process.env.BRH_ADMIN_PASSWORD!));
}

export async function requireAdminSession() {
  if (!await isAdminSession()) redirect("/admin/login");
}
