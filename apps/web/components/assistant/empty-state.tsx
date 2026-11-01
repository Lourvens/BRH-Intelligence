import { BookOpen } from "lucide-react";

export function EmptyState() {
  return (
    <div className="mx-auto w-full max-w-[780px] px-6 pb-8 pt-12 text-center">
      <div className="mx-auto mb-6 flex size-12 items-center justify-center rounded-2xl border border-border bg-surface-alt/50 text-ink-muted"><BookOpen className="size-5" aria-hidden /></div>
      <p className="mb-3 text-caption font-medium tracking-wide text-ink-muted">BRH Intelligence</p>
      <h2 className="font-display text-2xl font-medium leading-tight tracking-tight text-ink sm:text-4xl">
        Comprendre les documents.<br className="hidden sm:block" /> Éclairer votre recherche.
      </h2>
      <p className="mx-auto mt-4 max-w-md text-small leading-6 text-ink-muted">
        Explorez les publications de la BRH, comparez les informations et retrouvez leurs sources.
      </p>
    </div>
  );
}
