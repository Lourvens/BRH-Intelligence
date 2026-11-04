"use client";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { threadTimestamp, threadTimestampTitle } from "@/lib/chat/thread-time";
import type { ChatThread } from "@/lib/chat/types";
import { useNow } from "@/lib/hooks/use-now";
import { cn } from "@/lib/utils";

const GROUPS = ["Aujourd’hui", "Cette semaine", "Plus ancien"] as const;

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
  const now = useNow();

  return (
    <>
      {GROUPS.map((group) => {
        const items = threads
          .filter((thread) => thread.group === group)
          .slice()
          .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
        if (!items.length) return null;

        return (
          <SidebarGroup key={group} className="p-0">
            <SidebarGroupLabel className="h-7 px-2 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              {group}
            </SidebarGroupLabel>
            <SidebarMenu>
              {items.map((thread) => {
                const active = thread.id === activeThreadId;
                const initial = thread.title.trim().charAt(0).toLocaleUpperCase("fr") || "•";

                return (
                  <SidebarMenuItem key={thread.id}>
                    <SidebarMenuButton
                      type="button"
                      isActive={active}
                      onClick={() => onSelectThread(thread.id)}
                      aria-current={active ? "page" : undefined}
                      aria-label={thread.title}
                      tooltip={thread.title}
                      className={cn(
                        "group/thread h-auto min-h-10 items-start rounded-sm border-l-2 px-2 py-3 text-left transition-colors duration-150 motion-reduce:transition-none",
                        collapsed && "h-8! min-h-0! items-center px-0",
                        active
                          ? "border-azure bg-azure/10 text-navy-ink"
                          : "border-transparent text-ink-muted hover:bg-azure/5 hover:text-navy-ink",
                      )}
                    >
                      {collapsed ? (
                        <span
                          aria-hidden
                          className={cn(
                            "inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-[10px] font-bold",
                            active
                              ? "bg-azure/15 text-navy-ink"
                              : "bg-surface-alt text-ink-muted",
                          )}
                        >
                          {initial}
                        </span>
                      ) : null}
                      <span className={cn("min-w-0 flex-1", collapsed && "hidden")}>
                        <span className="block truncate text-[13px] font-medium">
                          {thread.title}
                        </span>
                        <time
                          dateTime={thread.updatedAt}
                          title={threadTimestampTitle(thread.updatedAt)}
                          className="mt-0.5 block text-[11px] tabular-nums text-ink-muted"
                        >
                          {threadTimestamp(thread.updatedAt, now)}
                        </time>
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
