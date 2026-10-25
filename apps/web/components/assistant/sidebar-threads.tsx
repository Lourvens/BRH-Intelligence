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
            <SidebarGroupLabel className="h-7 px-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
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
                        "group/thread h-auto min-h-10 items-start rounded-sm border-l-2 px-2 py-3 text-left transition-colors duration-150 motion-reduce:transition-none",
                        collapsed && "h-8! min-h-0! items-center px-0",
                        active
                          ? "border-azure bg-azure/10 text-navy-ink"
                          : "border-transparent text-ink-muted hover:bg-azure/5 hover:text-navy-ink",
                      )}
                    >
                      <MessageSquare
                        className={cn(
                          "size-3.5 shrink-0 transition-colors duration-150 group-hover/thread:text-navy-ink group-data-[active=true]:text-teal motion-reduce:transition-none",
                          collapsed ? "mt-0" : "mt-0.5",
                        )}
                        aria-hidden
                      />
                      <span
                        className={cn("min-w-0 flex-1", collapsed && "hidden")}
                      >
                        <span className="block truncate text-[13px] font-medium">
                          {thread.title}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-ink-muted">
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
