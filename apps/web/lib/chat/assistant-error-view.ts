import type { AssistantError } from "./assistant-error";

export type AssistantErrorIcon =
  | "timer"
  | "plug"
  | "message"
  | "file-question"
  | "lock"
  | "server"
  | "alert";

export type AssistantErrorActionId =
  | "retry"
  | "edit"
  | "new-thread"
  | "reload"
  | "explore"
  | "forget";

export type AssistantErrorAction = {
  id: AssistantErrorActionId;
  label: string;
  variant: "default" | "outline" | "ghost";
};

/** Handlers a surface provides; an action without one is not rendered. */
export type AssistantErrorActionHandlers = Partial<
  Record<AssistantErrorActionId, () => void>
>;

/** Where the failure belongs: inside a conversation, or over it. */
export type AssistantErrorSurface = "inline" | "panel";

export type AssistantErrorView = {
  kind: AssistantError["kind"];
  title: string;
  description: string;
  /** Short support reference, e.g. "404", shown as a muted eyebrow. */
  code: string | null;
  icon: AssistantErrorIcon;
  surface: AssistantErrorSurface;
  actions: AssistantErrorAction[];
  /** The destination itself is unusable: do not invite another send. */
  hideComposer: boolean;
  quota: string | null;
  waiting: boolean;
  waitLabel: string | null;
  waitingNote: string | null;
};

/** Shared header fields for the non-rate-limit views. */
export function errorHeader(
  error: AssistantError,
  waiting: boolean,
  waitLabel: string | null,
): Pick<AssistantErrorView, "code" | "waiting" | "waitLabel" | "waitingNote" | "quota"> {
  return {
    code: error.status ? String(error.status) : null,
    waiting,
    waitLabel,
    waitingNote: null,
    quota: null,
  };
}

export function retryAction(
  waiting: boolean,
  waitLabel: string | null,
  dailyQuota = false,
): AssistantErrorAction {
  const suffix = waitLabel ? ` dans ${waitLabel}` : "";
  return {
    id: "retry",
    label: !waiting ? "Réessayer" : dailyQuota ? `Quota${suffix}` : `Réessayer${suffix}`,
    variant: "outline",
  };
}
