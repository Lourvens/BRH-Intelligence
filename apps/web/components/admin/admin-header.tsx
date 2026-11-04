"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowUpRight, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminHeader() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-navy text-white">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <div>
            <p className="font-display text-small font-semibold text-ink">
              BRH Intelligence
            </p>
            <p className="text-caption text-ink-muted">
              Administration · Accès privé
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/assistant">
              Ouvrir l’assistant <ArrowUpRight aria-hidden />
            </Link>
          </Button>
          <Button
            variant="outline"
            aria-busy={pending}
            onClick={() => startTransition(() => router.refresh())}
          >
            <RefreshCw
              aria-hidden
              className={pending ? "motion-safe:animate-spin" : ""}
            />
            {pending ? "Actualisation…" : "Actualiser"}
          </Button>
          <form action="/api/admin/logout" method="post">
            <Button type="submit" variant="ghost">
              <LogOut aria-hidden />
              Déconnexion
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
