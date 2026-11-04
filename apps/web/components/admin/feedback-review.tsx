"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { adminDate } from "@/lib/admin/format";
import {
  feedbackCategories,
  feedbackStatuses,
  type AdminFeedback,
  type FeedbackStatus,
} from "@/lib/admin/types";

export function FeedbackReview({
  item,
  saving,
  error,
  onSave,
  onSavedClose,
}: {
  item: AdminFeedback;
  saving: boolean;
  error: string;
  onSave: (
    item: AdminFeedback,
    status: FeedbackStatus,
    note: string,
  ) => Promise<boolean>;
  onSavedClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(item.status);
  const [note, setNote] = useState(item.admin_note ?? "");
  const saved = useRef(false);
  const id = useId();
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!saving) setOpen(value);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10"
          onClick={() => {
            setStatus(item.status);
            setNote(item.admin_note ?? "");
          }}
        >
          Examiner
          <span className="sr-only">
            {" "}
            l’avis du {adminDate(item.created_at)}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[85dvh] overflow-y-auto bg-surface sm:max-w-xl"
        onInteractOutside={(event) => {
          if (saving) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (saving) event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          if (!saved.current) return;
          event.preventDefault();
          saved.current = false;
          onSavedClose();
        }}
      >
        <DialogHeader>
          <DialogTitle>Examiner l’avis</DialogTitle>
          <DialogDescription>
            {feedbackCategories[item.category]} · {adminDate(item.created_at)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <p className="whitespace-pre-wrap break-words rounded-xl bg-surface-alt p-4 font-reading text-base leading-relaxed">
            {item.message}
          </p>
          <p className="break-all text-caption text-ink-muted">
            Page : {item.page_path}
            {item.thread_id ? ` · Conversation : ${item.thread_id}` : ""}
          </p>
          {item.answer_excerpt && (
            <div>
              <h3 className="text-caption font-medium text-ink-muted">
                Extrait partagé par la personne
              </h3>
              <blockquote className="mt-2 whitespace-pre-wrap break-words border-l-2 border-border pl-3 font-reading text-small leading-relaxed">
                {item.answer_excerpt}
              </blockquote>
            </div>
          )}
        </div>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (await onSave(item, status, note)) {
              saved.current = true;
              setOpen(false);
            }
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label htmlFor={`${id}-status`} className="text-small font-medium">
              Statut de traitement
            </label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as FeedbackStatus)}
              disabled={saving}
            >
              <SelectTrigger id={`${id}-status`} className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(feedbackStatuses).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor={`${id}-note`} className="text-small font-medium">
              Note interne
            </label>
            <Textarea
              id={`${id}-note`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={4000}
              rows={4}
              disabled={saving}
              placeholder="Diagnostic, correction prévue ou motif de résolution…"
            />
            <p className="text-caption text-ink-muted">
              Cette note reste dans l’administration.
            </p>
          </div>
          <p
            role="status"
            aria-live="polite"
            className="text-small text-scarlet"
          >
            {error}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              disabled={saving}
              onClick={() => setOpen(false)}
            >
              Fermer
            </Button>
            <Button type="submit" aria-busy={saving} aria-disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer le suivi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
