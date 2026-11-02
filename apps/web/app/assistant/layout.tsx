import type { ReactNode } from "react";
import { AssistantShell } from "@/components/assistant/assistant-shell";

/** Keep the stream mounted when a new conversation receives its thread URL. */
export default function AssistantLayout({ children }: { children: ReactNode }) {
  return <><AssistantShell />{children}</>;
}
