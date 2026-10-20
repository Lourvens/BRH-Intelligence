"use client";

import { MessageSquare } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { ChatThread } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

const GROUPS = ["Aujourd’hui", "Cette semaine"] as const;

export function ThreadList({
  threads,
  activeThreadId,
  onSelectThread,
  collapsed,
}: {
  threads: readonly ChatThread[];
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  collapsed: boolean;
}) {
  return (
    <>
      {GROUPS.map((group) => {
        const items = threads.filter((thread) => thread.group === group);
        if (!items.length) return null;

        return (
          <SidebarGroup key={group} className="p-0">
            <SidebarGroupLabel className="h-7 px-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              {group}
            </SidebarGroupLabel>
            <SidebarMenu>
              {items.map((thread) => {
                const active = thread.id === activeThreadId;

                return (
                  <SidebarMenuItem key={thread.id}>
                    <SidebarMenuButton
                      type="button"
                      isActive={active}
                      onClick={() => onSelectThread(thread.id)}
                      aria-current={active ? "page" : undefined}
                      tooltip={thread.title}
                      className={cn(
                        "h-auto min-h-10 items-start rounded-lg border-l-2 px-2 py-2 text-left",
                        collapsed && "h-8! min-h-0! items-center px-0",
                        active
                          ? "border-azure bg-azure/5 text-navy"
                          : "border-transparent text-ink-muted hover:bg-sidebar-accent hover:text-navy",
                      )}
                    >
                      <MessageSquare
                        className={cn(
                          "size-3.5 shrink-0",
                          collapsed ? "mt-0" : "mt-0.5",
                        )}
                        aria-hidden
                      />
                      <span
                        className={cn("min-w-0 flex-1", collapsed && "hidden")}
                      >
                        <span className="block truncate text-[11px] font-medium">
                          {thread.title}
                        </span>
                        <span className="mt-0.5 block text-[9px] text-ink-muted">
                          {thread.updatedAt}
                        </span>
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        );
      })}

      {!threads.length ? (
        <p className="px-2 py-6 text-center text-[11px] text-ink-muted">
          Aucune conversation ne correspond.
        </p>
      ) : null}
    </>
  );
}
