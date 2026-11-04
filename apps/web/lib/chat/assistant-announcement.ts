import { ACTIVITY_LABELS, type AgentActivity } from "./agent-activity";
import type { AssistantError } from "./assistant-error";

/** Screen-reader announcement for the current assistant workspace state. */
export function assistantAnnouncement({
  isRestoring,
  error,
  isStopping,
  runStatus,
  isThinking,
  streaming,
  currentActivity,
}: {
  isRestoring: boolean;
  error: AssistantError | null;
  isStopping: boolean;
  runStatus: "idle" | "running" | "stopped" | "error";
  isThinking: boolean;
  streaming: boolean;
  currentActivity: AgentActivity | undefined;
}): string {
  if (isRestoring) return "Chargement de la conversation…";
  if (error?.kind === "rate_limit") {
    return error.subcode === "daily_token_limit"
      ? "Quota quotidien atteint. Il se réinitialise à minuit UTC."
      : "Limite de requêtes atteinte. Une nouvelle tentative sera possible dans quelques instants.";
  }
  if (isStopping) return "Arrêt du traitement…";
  if (runStatus === "stopped") return "Traitement interrompu.";
  if (!isThinking) return "";
  if (streaming) return "L’assistant rédige sa réponse.";
  return currentActivity
    ? ACTIVITY_LABELS[currentActivity.stage]
    : "Demande envoyée à l’assistant.";
}
