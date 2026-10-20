"use client";

import { ArrowLeft, MessageSquare, Plus, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/utils";
import type { ChatThread } from "@/lib/chat/types";

export function Sidebar({
  threads,
  activeThreadId,
  onSelectThread,
  onNewThread,
  onClose,
}: {
  threads: readonly ChatThread[];
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
  onClose?: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = threads.filter((thread) =>
    thread.title.toLowerCase().includes(query.toLowerCase()),
  );
  const groups = ["Aujourd’hui", "Cette semaine"] as const;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <Link
          href="/"
          aria-label="BRH Intelligence — accueil"
          className="flex min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
        >
          <Image
            src="/brh-logo.png"
            alt="BRH"
            width={251}
            height={123}
            className="h-6 w-auto"
          />
          <span className="hidden h-5 w-px bg-border sm:block" />
          <span className="min-w-0">
            <span className="block font-display text-caption font-bold leading-none text-navy">
              Intelligence
            </span>
            <span className="mt-0.5 block truncate text-[9px] text-ink-muted">
              Assistant documentaire
            </span>
          </span>
        </Link>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le panneau"
            className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-surface-alt lg:hidden"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="shrink-0 space-y-3 p-3">
        <button
          type="button"
          onClick={onNewThread}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-3 py-2.5 text-caption font-semibold text-white shadow-sm transition-colors hover:bg-navy-deep"
        >
          <Plus className="size-4" aria-hidden />
          Nouvelle conversation
        </button>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher dans l’historique…"
            aria-label="Rechercher une conversation"
            className="h-9 w-full rounded-lg border border-border bg-bg pl-8 pr-3 text-[11px] text-ink outline-none placeholder:text-ink-muted/70 focus:border-navy/30"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {groups.map((group) => {
          const items = filtered.filter((thread) => thread.group === group);
          if (!items.length) return null;

          return (
            <div key={group} className="mb-4">
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                {group}
              </div>
              <div className="space-y-1">
                {items.map((thread) => {
                  const active = thread.id === activeThreadId;

                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => onSelectThread(thread.id)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-lg border-l-2 px-2 py-2 text-left transition-colors",
                        active
                          ? "border-azure bg-azure/5 text-navy"
                          : "border-transparent text-ink-muted hover:bg-surface-alt/70 hover:text-navy",
                      )}
                    >
                      <MessageSquare className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-medium">
                          {thread.title}
                        </span>
                        <span className="mt-0.5 block text-[9px] text-ink-muted">
                          {thread.updatedAt}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {!filtered.length ? (
          <p className="px-2 py-6 text-center text-[11px] text-ink-muted">
            Aucune conversation ne correspond.
          </p>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-border p-3">
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-gold/10 px-2.5 py-2 text-[10px] text-gold-ink">
          <span className="size-1.5 rounded-full bg-gold-ink" />
          Mode démonstration · réponses préenregistrées
        </div>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-2 py-2 text-[11px] font-medium text-ink-muted transition-colors hover:bg-surface-alt hover:text-navy"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Retour au portail officiel
        </Link>
      </div>
    </div>
  );
}
