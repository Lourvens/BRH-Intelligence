import {
  FileQuestion,
  LockKeyhole,
  MessageSquareX,
  PlugZap,
  ServerCrash,
  Timer,
  TriangleAlert,
} from "lucide-react";

import type { AssistantErrorIcon } from "@/lib/chat/assistant-error-view";

const ICONS = {
  timer: Timer,
  plug: PlugZap,
  message: MessageSquareX,
  "file-question": FileQuestion,
  lock: LockKeyhole,
  server: ServerCrash,
  alert: TriangleAlert,
} satisfies Record<AssistantErrorIcon, typeof Timer>;

/** The one icon set used by every assistant error surface. */
export function AssistantErrorGlyph({
  icon,
  className,
}: {
  icon: AssistantErrorIcon;
  className?: string;
}) {
  const Icon = ICONS[icon] ?? TriangleAlert;
  return <Icon className={className} aria-hidden />;
}
