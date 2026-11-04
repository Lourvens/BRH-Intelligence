"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: form.get("password") }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Connexion impossible. Réessayez.");
      }
      router.replace("/admin");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof TypeError ? "Connexion indisponible. Réessayez." : cause instanceof Error ? cause.message : "Connexion impossible.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <form onSubmit={login} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="admin-password" className="text-small font-medium">Clé d’accès</label>
        <Input id="admin-password" name="password" type="password" autoComplete="current-password" required maxLength={512} disabled={!configured || pending} aria-describedby="admin-login-status" className="h-12" />
      </div>
      <p id="admin-login-status" role="status" className="min-h-5 text-small text-ink-muted">
        {!configured ? "L’accès administrateur doit être configuré sur le serveur." : error}
      </p>
      <Button type="submit" disabled={!configured || pending} aria-busy={pending} className="h-12 w-full gap-2">
        <LockKeyhole className="size-4" aria-hidden />
        {pending ? "Connexion…" : "Accéder au tableau de bord"}
      </Button>
    </form>
  );
}
