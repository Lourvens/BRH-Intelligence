"use client";

import { CheckCircle2, MessageSquare } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { feedbackCategories, feedbackLimits, type FeedbackCategory } from "@/lib/feedback/types";
import { useFeedback } from "@/lib/hooks/use-feedback";
import { cn } from "@/lib/utils";

export function FeedbackDialog({ threadId, answerExcerpt, compact = false }: {
  threadId?: string | null;
  answerExcerpt?: string;
  compact?: boolean;
}) {
  const id = useId();
  const feedback = useFeedback({ threadId, answerExcerpt });

  return (
    <Dialog open={feedback.open} onOpenChange={feedback.changeOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className={cn("h-10 gap-1.5 px-2 text-caption text-ink-muted hover:bg-surface-alt hover:text-navy-ink", compact && "rounded-lg")}>
          <MessageSquare className="size-3.5" aria-hidden />
          <span className={compact ? "sr-only sm:not-sr-only" : undefined}>Donner un avis</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto bg-surface text-ink" showCloseButton={!feedback.pending}>
        <DialogHeader>
          <DialogTitle className="font-display">{feedback.submittedId ? "Merci pour votre avis" : "Aidez-nous à améliorer l’assistant"}</DialogTitle>
          <DialogDescription>
            {feedback.submittedId ? "Votre avis a été enregistré et sera consulté par l’équipe." : "Une erreur, un problème ou une idée ? Décrivez ce que nous pouvons améliorer."}
          </DialogDescription>
        </DialogHeader>
        <p role="status" aria-live="polite" className={feedback.submittedId ? "flex items-center gap-2 rounded-lg bg-surface-alt p-3 text-small" : "sr-only"}>
          {feedback.submittedId && <><CheckCircle2 className="size-5 shrink-0 text-emerald" aria-hidden />Avis bien reçu.</>}
        </p>
        {feedback.submittedId ? (
          <DialogFooter><DialogClose asChild><Button type="button">Fermer</Button></DialogClose></DialogFooter>
        ) : (
          <form onSubmit={(event) => { event.preventDefault(); void feedback.submit(); }} className="space-y-4" aria-busy={feedback.pending} noValidate>
            <div className="space-y-2">
              <label htmlFor={`${id}-category`} className="text-small font-medium">Type d’avis</label>
              <Select value={feedback.category} onValueChange={(value) => feedback.setCategory(value as FeedbackCategory)} disabled={feedback.pending}>
                <SelectTrigger id={`${id}-category`} className="h-11 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(feedbackCategories).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor={`${id}-message`} className="text-small font-medium">Votre avis</label>
              <Textarea
                ref={feedback.messageRef}
                id={`${id}-message`}
                value={feedback.message}
                onChange={(event) => feedback.setMessage(event.target.value)}
                readOnly={feedback.pending}
                maxLength={feedbackLimits.messageMax}
                aria-invalid={Boolean(feedback.error)}
                aria-describedby={`${id}-hint ${id}-error`}
                placeholder="Indiquez le problème rencontré ou l’amélioration souhaitée…"
                className="min-h-32 resize-y text-base"
              />
              <p id={`${id}-hint`} className="text-caption text-ink-muted">10 à 4 000 caractères · Évitez les informations personnelles ou confidentielles.</p>
            </div>
            {answerExcerpt && (
              <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-caption leading-relaxed">
                <input type="checkbox" checked={feedback.includeAnswer} onChange={(event) => feedback.setIncludeAnswer(event.target.checked)} disabled={feedback.pending} className="mt-1 size-4 shrink-0 accent-[var(--color-navy)]" />
                Joindre un extrait de cette réponse (2 000 caractères maximum) pour aider l’équipe à comprendre.
              </label>
            )}
            <p className="text-caption leading-relaxed text-ink-muted">La page et, le cas échéant, l’identifiant de conversation seront joints. Le contenu de la conversation n’est pas envoyé automatiquement.</p>
            <p id={`${id}-error`} role="alert" className={cn("text-caption leading-relaxed text-scarlet", !feedback.error && "sr-only")}>{feedback.error}</p>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline" disabled={feedback.pending}>Annuler</Button></DialogClose>
              <Button type="submit" aria-disabled={feedback.pending} aria-busy={feedback.pending} className="min-w-36 aria-disabled:opacity-60">{feedback.pending ? "Envoi en cours…" : "Envoyer mon avis"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
