"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Check,
  Copy,
  FileText,
  Link2,
  MessageSquare,
  Share2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { threadIdFromPath, threadShareUrl } from "@/lib/chat/thread-path";
import { useActionFeedback } from "@/lib/hooks/use-action-feedback";

const recipientActions = [
  { icon: BookOpen, label: "Lire la réponse et ses passages cités." },
  { icon: FileText, label: "Ouvrir les documents et pages sources." },
  { icon: MessageSquare, label: "Poursuivre la conversation dans ce fil." },
];

export function ShareDialog({ threadId }: { threadId: string | null }) {
  const [url, setUrl] = useState("");
  const copyFeedback = useActionFeedback();
  const shareFeedback = useActionFeedback();
  const copyState = copyFeedback.state;
  const shareState = shareFeedback.state;

  useEffect(() => {
    const id = threadId ?? threadIdFromPath(window.location.pathname);
    setUrl(
      id
        ? threadShareUrl(id, window.location.origin)
        : window.location.href,
    );
  }, [threadId]);

  const copyLabel =
    copyState === "success"
      ? "Lien copié"
      : copyState === "pending"
        ? "Copie…"
        : copyState === "error"
          ? "Réessayer"
          : "Copier";
  const shareLabel =
    shareState === "success"
      ? "Partagé"
      : shareState === "fallback"
        ? "Lien copié"
        : shareState === "pending"
          ? "Partage…"
          : shareState === "error"
            ? "Réessayer"
            : "Partager";
  const announcement =
    copyState === "success"
      ? "Lien de la conversation copié."
      : shareState === "success"
        ? "Conversation partagée."
        : shareState === "fallback"
          ? "Lien de la conversation copié."
          : copyState === "error" || shareState === "error"
            ? "Le partage a échoué. Réessayez."
            : "";

  function copy() {
    if (!url) return;
    void copyFeedback.run(() => navigator.clipboard.writeText(url));
  }

  function share() {
    if (!url) return;
    void shareFeedback.run(async () => {
      const data = {
        title: "BRH Intelligence",
        text: "Conversation avec l’assistant documentaire BRH",
        url,
      };
      if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
        try {
          await navigator.share(data);
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            throw error;
          }
        }
      }
      await navigator.clipboard.writeText(url);
      return "fallback";
    });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Partager la conversation"
          className="h-10 gap-1.5 rounded-sm px-2 text-caption text-ink-muted transition-colors hover:bg-surface-alt hover:text-navy-ink"
        >
          <Share2 className="size-3.5" aria-hidden />
          Partager
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 grid size-10 place-items-center rounded-lg bg-surface-alt text-teal">
            <Share2 className="size-5" aria-hidden />
          </div>
          <DialogTitle className="font-display text-lg text-navy-ink">
            Partager cette conversation
          </DialogTitle>
          <DialogDescription className="text-small leading-6 text-ink-muted">
            Le lien ouvre cette conversation dans l’assistant documentaire.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface-alt/60 p-4">
            <p className="text-caption font-bold uppercase tracking-wider text-ink-muted">
              Ce que le destinataire pourra faire
            </p>
            <ul className="mt-3 space-y-2.5">
              {recipientActions.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-start gap-2.5 text-small text-ink">
                  <Icon className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label
              htmlFor="share-thread-url"
              className="text-caption font-medium text-ink"
            >
              Lien de la conversation
            </label>
            <div className="mt-1.5 flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Link2
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
                  aria-hidden
                />
                <Input
                  id="share-thread-url"
                  readOnly
                  value={url}
                  placeholder="Préparation du lien…"
                  onFocus={(event) => event.currentTarget.select()}
                  className="h-11 rounded-xl bg-surface pl-9 text-caption"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={copy}
                disabled={!url || copyState === "pending"}
                className="h-11 shrink-0 gap-1.5 rounded-xl"
              >
                {copyState === "success" ? (
                  <Check className="size-3.5 text-emerald" aria-hidden />
                ) : (
                  <Copy className="size-3.5" aria-hidden />
                )}
                {copyLabel}
              </Button>
            </div>
          </div>

          <p className="text-caption leading-5 text-ink-muted">
            Le lien est public : toute personne qui le possède peut consulter
            cette conversation. Il ne donne pas accès à vos autres
            conversations.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="rounded-xl">
              Fermer
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={share}
            disabled={!url || shareState === "pending"}
            className="gap-2 rounded-xl"
          >
            <Share2 className="size-4" aria-hidden />
            {shareLabel}
          </Button>
        </DialogFooter>

        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </DialogContent>
    </Dialog>
  );
}
