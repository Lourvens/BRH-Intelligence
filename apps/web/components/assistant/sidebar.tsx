"use client";

import { ArrowLeft, Plus, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, type ChangeEvent } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInput,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarTrigger,
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

  return (
    <div className="flex h-full flex-col">
      <SidebarHeader
        className={cn(
          "flex h-16 min-h-16 flex-row items-center justify-between gap-2 border-b border-sidebar-border p-3",
          collapsed && "justify-center p-1",
        )}
      >
        {!collapsed ? (
          <Link
            href="/"
            aria-label="BRH Intelligence — accueil"
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <span className="inline-flex shrink-0 items-center justify-center dark:rounded-sm dark:bg-white dark:p-0.5">
              <Image
                src="/brh-logo.png"
                alt="BRH"
                width={251}
                height={123}
                className="h-6 w-auto"
              />
            </span>
            <span className="hidden h-5 w-px bg-sidebar-border sm:block" />
            <span className="min-w-0">
              <span className="block font-display text-caption font-bold leading-none text-navy-ink">
                Intelligence
              </span>
              <span className="mt-0.5 block truncate text-caption text-ink-muted">
                Assistant documentaire
              </span>
            </span>
          </Link>
        ) : null}
        {!isMobile ? (
          <SidebarTrigger
            aria-label="Replier ou déplier la navigation"
            className="size-8 shrink-0 text-ink-muted hover:bg-surface-alt hover:text-navy-ink"
          />
        ) : null}
        {isMobile ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpenMobile(false)}
            aria-label="Fermer les conversations"
            className="ml-auto text-ink-muted md:hidden"
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
                onClick={() => { onNewThread(); if (isMobile) setOpenMobile(false); }}
                aria-label="Nouvelle conversation"
                className="mx-auto size-9 rounded-sm bg-navy text-white shadow-none hover:bg-navy-deep"
              >
                <Plus className="size-4" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Nouvelle conversation</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            type="button"
            onClick={() => { onNewThread(); if (isMobile) setOpenMobile(false); }}
            className="w-full rounded-sm bg-navy text-caption text-white shadow-none transition-colors duration-150 hover:bg-navy-deep motion-reduce:transition-none"
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
                className="mx-auto size-9 text-ink-muted hover:bg-sidebar-accent hover:text-navy-ink"
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
              onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
              placeholder="Rechercher dans l’historique…"
              aria-label="Rechercher une conversation"
              className="h-9 border-border bg-bg pl-8 text-caption focus-visible:border-navy-ink/30"
            />
          </div>
        )}
      </div>

      <SidebarSeparator className={cn("mx-3 w-auto", collapsed && "mx-2")} />

      <SidebarContent className={cn("px-1.5 pb-4", collapsed && "px-1")}>
        <ThreadList
          threads={filtered}
          activeThreadId={activeThreadId}
          onSelectThread={(id) => { onSelectThread(id); if (isMobile) setOpenMobile(false); }}
          collapsed={collapsed}
        />
      </SidebarContent>

      <SidebarFooter
        className={cn(
          "border-t border-sidebar-border p-3",
          collapsed && "items-center p-1",
        )}
      >
        <SidebarMenuButton asChild tooltip="Explorer le corpus"><Link href="/brh-corpus"><Search className="size-4" aria-hidden />{!collapsed ? <span>Explorer le corpus</span> : null}</Link></SidebarMenuButton>
        <ThemeToggle
          withLabel={!collapsed}
          className={cn("rounded-sm text-caption shadow-none active:scale-100", collapsed && "mx-auto")}
        />
        <SidebarMenuButton
          asChild
          tooltip="Retour au portail officiel"
          className={cn(
            "text-caption text-ink-muted hover:text-navy-ink",
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
