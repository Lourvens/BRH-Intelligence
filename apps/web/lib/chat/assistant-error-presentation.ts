import type { AssistantError, NotFoundResource } from "./assistant-error";
import { formatRetryDelay } from "./retry-delay";
import { rateLimitView } from "./assistant-error-rate-limit";
import {
  errorHeader,
  retryAction,
  type AssistantErrorAction,
  type AssistantErrorSurface,
  type AssistantErrorView,
} from "./assistant-error-view";

function notFoundView(
  error: AssistantError,
  surface: AssistantErrorSurface,
  canForget: boolean,
  waiting: boolean,
  waitLabel: string | null,
): AssistantErrorView {
  const resource: NotFoundResource = error.resource ?? "thread";
  const base = { ...errorHeader(error, waiting, waitLabel), kind: error.kind };

  switch (resource) {
    case "assistant":
      return {
        ...base,
        title: "Assistant introuvable",
        description:
          "L’assistant configuré pour ce service est introuvable. Rechargez la page ; si le problème persiste, contactez l’administrateur.",
        icon: "server",
        surface,
        hideComposer: true,
        actions: [{ id: "reload", label: "Recharger la page", variant: "default" }],
      };
    case "run":
      return {
        ...base,
        title: "Réponse introuvable",
        description:
          "Cette réponse n’est plus disponible sur le serveur. Reposez votre question pour en obtenir une nouvelle.",
        icon: "file-question",
        surface: "inline",
        hideComposer: false,
        actions: [
          retryAction(waiting, waitLabel),
          { id: "new-thread", label: "Nouvelle conversation", variant: "ghost" },
        ],
      };
    case "service":
      return {
        ...base,
        title: "Service introuvable",
        description:
          "L’adresse du service de l’assistant est injoignable. Réessayez dans quelques instants ; si le problème persiste, contactez l’administrateur.",
        icon: "plug",
        surface,
        hideComposer: true,
        actions: [
          retryAction(waiting, waitLabel),
          { id: "reload", label: "Recharger la page", variant: "ghost" },
        ],
      };
    default:
      return {
        ...base,
        title: "Conversation introuvable",
        description:
          "Cette conversation n’existe plus sur le serveur : elle a peut-être expiré ou été supprimée. Les autres conversations de votre historique restent disponibles.",
        icon: "message",
        surface,
        hideComposer: true,
        actions: [
          { id: "new-thread", label: "Nouvelle conversation", variant: "default" },
          { id: "explore", label: "Explorer le corpus", variant: "ghost" },
          ...(canForget
            ? [{ id: "forget" as const, label: "Retirer de l’historique", variant: "ghost" as const }]
            : []),
        ],
      };
  }
}

/**
 * One view model per failure class. Placement follows the scope of the error:
 * a missing destination takes over the workspace, a failed turn stays inline.
 */
export function presentAssistantError({
  error,
  remainingSeconds,
  hasConversation,
  canForget,
}: {
  error: AssistantError;
  remainingSeconds: number;
  hasConversation: boolean;
  canForget: boolean;
}): AssistantErrorView {
  const waiting = remainingSeconds > 0;
  const waitLabel = waiting ? formatRetryDelay(remainingSeconds) : null;
  const surface: AssistantErrorSurface = hasConversation ? "inline" : "panel";
  const header = { ...errorHeader(error, waiting, waitLabel), kind: error.kind };

  switch (error.kind) {
    case "rate_limit":
      return rateLimitView(error, waiting, waitLabel);
    case "not_found":
      return notFoundView(error, surface, canForget, waiting, waitLabel);
    case "forbidden":
      return {
        ...header,
        title: "Accès refusé",
        description:
          "Votre session n’autorise pas l’accès à cette conversation. Rechargez la page pour renouveler la connexion, puis réessayez.",
        icon: "lock",
        surface,
        hideComposer: true,
        actions: [{ id: "reload", label: "Recharger la page", variant: "default" }],
      };
    case "invalid":
      return {
        ...header,
        title: "Question refusée",
        description:
          "Cette demande n’a pas pu être traitée. Reformulez la question ou raccourcissez-la, puis réessayez.",
        icon: "alert",
        surface: "inline",
        hideComposer: false,
        actions: [{ id: "edit", label: "Modifier la question", variant: "outline" }],
      };
    case "unavailable":
      return {
        ...header,
        title: "Service momentanément indisponible",
        description:
          "Le service de l’assistant ne répond pas pour le moment. Réessayez dans quelques instants.",
        icon: "server",
        surface: "inline",
        hideComposer: false,
        actions: [retryAction(waiting, waitLabel)],
      };
    case "connection":
      return {
        ...header,
        title: "Connexion interrompue",
        description:
          "Impossible de joindre l’assistant. Vérifiez votre connexion réseau, puis réessayez.",
        icon: "plug",
        surface: "inline",
        hideComposer: false,
        actions: [retryAction(waiting, waitLabel)],
      };
    default:
      return {
        ...header,
        title: "Demande interrompue",
        description:
          "Une erreur inattendue a interrompu la réponse. Réessayez ; si le problème persiste, rechargez la page.",
        icon: "alert",
        surface: "inline",
        hideComposer: false,
        actions: [
          retryAction(waiting, waitLabel),
          { id: "reload", label: "Recharger la page", variant: "ghost" },
        ],
      };
  }
}
