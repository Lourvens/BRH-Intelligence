"use client";

import { RefreshCw, MessageSquare } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminDate, adminNumber } from "@/lib/admin/format";
import {
  feedbackCategories,
  feedbackStatuses,
  type FeedbackPage,
  type FeedbackStatus,
} from "@/lib/admin/types";
import { useAdminFeedback } from "@/lib/hooks/use-admin-feedback";
import { FeedbackReview } from "./feedback-review";

export function FeedbackInbox({ initial }: { initial: FeedbackPage | null }) {
  const inbox = useAdminFeedback(initial);
  const refreshButton = useRef<HTMLButtonElement>(null);
  const pages = inbox.data
    ? Math.max(1, Math.ceil(inbox.data.total / inbox.data.page_size))
    : 1;
  return (
    <section
      id="avis"
      className="scroll-mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-6"
      aria-labelledby="feedback-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2
            id="feedback-heading"
            className="font-display text-lead font-semibold"
          >
            Avis des utilisateurs
          </h2>
          <p className="mt-1 text-small text-ink-muted">
            Signalez les points à corriger et gardez une trace du suivi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={inbox.status}
            onValueChange={(value) =>
              inbox.filter(value as FeedbackStatus | "all")
            }
            disabled={inbox.pending || inbox.saving}
          >
            <SelectTrigger
              aria-label="Filtrer les avis par statut"
              className="h-11 min-w-36"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les avis</SelectItem>
              {Object.entries(feedbackStatuses).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            ref={refreshButton}
            variant="outline"
            aria-disabled={inbox.pending || inbox.saving}
            onClick={() => {
              if (!inbox.pending && !inbox.saving) inbox.refresh();
            }}
            aria-label="Actualiser les avis"
            className="size-11"
          >
            <RefreshCw
              className={inbox.pending ? "motion-safe:animate-spin" : ""}
              aria-hidden
            />
          </Button>
        </div>
      </div>
      <div role="status" aria-live="polite" className="mt-3 min-h-6 text-small">
        <p className="text-scarlet">{inbox.error}</p>
        {!inbox.error && <p className="text-emerald">{inbox.notice}</p>}
      </div>
      <div
        aria-busy={inbox.pending}
        className={inbox.pending ? "opacity-60" : ""}
      >
        {inbox.pending && (
          <p className="py-3 text-small text-ink-muted">Chargement des avis…</p>
        )}
        {!inbox.data ? (
          <p className="py-8 text-small text-ink-muted">
            Les avis sont indisponibles. Utilisez Actualiser pour réessayer.
          </p>
        ) : !inbox.data.items.length ? (
          <div className="py-10 text-center">
            <MessageSquare
              className="mx-auto size-6 text-ink-muted"
              aria-hidden
            />
            <p className="mt-3 font-medium">Aucun avis dans cette sélection</p>
            <p className="mt-1 text-small text-ink-muted">
              Les nouveaux avis apparaîtront ici.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {inbox.data.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-caption">
                    <span className="rounded-md bg-surface-alt px-2 py-1 font-medium text-navy-ink">
                      {feedbackStatuses[item.status]}
                    </span>
                    <span className="text-ink-muted">
                      {feedbackCategories[item.category]} ·{" "}
                      {adminDate(item.created_at)}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-small leading-relaxed">
                    {item.message}
                  </p>
                  <p className="mt-2 truncate text-caption text-ink-muted">
                    {item.page_path}
                  </p>
                </div>
                <FeedbackReview
                  item={item}
                  saving={inbox.saving}
                  error={inbox.error}
                  onSave={inbox.save}
                  onSavedClose={() => {
                    refreshButton.current?.focus();
                    inbox.reviewClosed();
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-caption text-ink-muted">
          {adminNumber(inbox.data?.total)} avis · Page {inbox.page} sur {pages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={inbox.page <= 1 || inbox.pending || inbox.saving}
            onClick={() => inbox.setPage(inbox.page - 1)}
          >
            Précédent
          </Button>
          <Button
            variant="outline"
            disabled={inbox.page >= pages || inbox.pending || inbox.saving}
            onClick={() => inbox.setPage(inbox.page + 1)}
          >
            Suivant
          </Button>
        </div>
      </div>
    </section>
  );
}
