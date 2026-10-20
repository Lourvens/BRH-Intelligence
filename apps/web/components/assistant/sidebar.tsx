"use client";

import { ArrowLeft, Plus, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInput,
  SidebarMenuButton,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ChatThread } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

import { ThreadList } from "./sidebar-threads";

export function ConversationSidebar({
  threads,
  activeThreadId,
  onSelectThread,
  onNewThread,
}: {
  threads: readonly ChatThread[];
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
}) {
  const [query, setQuery] = useState("");
  const { isMobile, state, setOpen, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const filtered = threads.filter((thread) =>
    thread.title.toLowerCase().includes(query.toLowerCase()),
  );
  const groups = ["Aujourd’hui", "Cette semaine"] as const;

  return (
    <div className="flex h-full flex-col">
      <SidebarHeader
        className={cn(
          "flex h-14 min-h-14 flex-row items-center justify-between gap-2 border-b border-sidebar-border p-3",
          collapsed && "justify-center p-1",
        )}
      >
        <Link
          href="/"
          aria-label="BRH Intelligence — accueil"
          className={cn(
            "flex min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            collapsed && "justify-center",
          )}
        >
          <Image
            src="/brh-logo.png"
            alt="BRH"
            width={251}
            height={123}
            className={cn("h-6 w-auto", collapsed && "h-7")}
          />
          {!collapsed ? (
            <>
              <span className="hidden h-5 w-px bg-sidebar-border sm:block" />
              <span className="min-w-0">
                <span className="block font-display text-caption font-bold leading-none text-navy">
                  Intelligence
                </span>
                <span className="mt-0.5 block truncate text-[9px] text-ink-muted">
                  Assistant documentaire
                </span>
              </span>
            </>
          ) : null}
        </Link>
        {isMobile ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpenMobile(false)}
            aria-label="Fermer les conversations"
            className="text-ink-muted md:hidden"
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </SidebarHeader>

      <div className={cn("shrink-0 space-y-3 p-3", collapsed && "p-1")}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                onClick={onNewThread}
                aria-label="Nouvelle conversation"
                className="mx-auto size-9 rounded-lg bg-navy text-white shadow-sm hover:bg-navy-deep"
              >
                <Plus className="size-4" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Nouvelle conversation</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            type="button"
            onClick={onNewThread}
            className="w-full rounded-xl bg-navy text-caption text-white shadow-sm hover:bg-navy-deep"
          >
            <Plus className="size-4" aria-hidden />
            Nouvelle conversation
          </Button>
        )}

        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(true)}
                aria-label="Rechercher dans l’historique"
                className="mx-auto size-9 text-ink-muted hover:bg-sidebar-accent hover:text-navy"
              >
                <Search className="size-4" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Rechercher</TooltipContent>
          </Tooltip>
        ) : (
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-3.5 -translate-y-1/2 text-ink-muted"
              aria-hidden
            />
            <SidebarInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher dans l’historique…"
              aria-label="Rechercher une conversation"
              className="h-9 border-border bg-bg pl-8 text-[11px] focus-visible:border-navy/30"
            />
          </div>
        )}
      </div>

      <SidebarSeparator className={cn("mx-3 w-auto", collapsed && "mx-2")} />

      <SidebarContent className={cn("px-1.5 pb-4", collapsed && "px-1")}>
        <ThreadList
          threads={filtered}
          activeThreadId={activeThreadId}
          onSelectThread={onSelectThread}
          collapsed={collapsed}
        />
      </SidebarContent>

      <SidebarFooter
        className={cn(
          "border-t border-sidebar-border p-3",
          collapsed && "items-center p-1",
        )}
      >
        {!collapsed ? (
          <Badge
            variant="outline"
            className="w-full justify-start gap-2 rounded-lg border-transparent bg-gold/10 px-2.5 py-2 text-[10px] font-normal text-gold-ink"
          >
            <span className="size-1.5 rounded-full bg-gold-ink" />
            Mode démonstration · réponses préenregistrées
          </Badge>
        ) : null}
        <SidebarMenuButton
          asChild
          tooltip="Retour au portail officiel"
          className={cn(
            "text-[11px] text-ink-muted hover:text-navy",
            collapsed && "justify-center",
          )}
        >
          <Link href="/">
            <ArrowLeft className="size-3.5" aria-hidden />
            {!collapsed ? <span>Retour au portail officiel</span> : null}
          </Link>
        </SidebarMenuButton>
      </SidebarFooter>
    </div>
  );
}
