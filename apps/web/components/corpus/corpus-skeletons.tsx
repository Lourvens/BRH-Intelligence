import { Skeleton } from "@/components/ui/skeleton";

function SearchAreaSkeleton({ entities = false }: { entities?: boolean }) {
  return (
    <div className="atlas-search-area" aria-hidden>
      <div className="atlas-search-box">
        <Skeleton className="size-5 shrink-0 rounded-full" />
        <Skeleton className="h-5 min-w-0 flex-1" />
        <Skeleton className="h-11 w-11 shrink-0 rounded-xl sm:w-36" />
      </div>
      <div className="atlas-search-options">
        {!entities && (
          <Skeleton className="h-[54px] w-72 max-w-full rounded-xl" />
        )}
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="corpus-filter-sheet-trigger h-11 w-28 rounded-xl" />
          {!entities && <Skeleton className="h-11 w-40 rounded-lg" />}
        </div>
      </div>
    </div>
  );
}

function DocumentRowSkeleton({ secondLine = false }: { secondLine?: boolean }) {
  return (
    <li>
      <article className="atlas-document">
        <div className="atlas-document-body">
          <div className="flex h-[27px] items-center gap-3">
            <Skeleton className="h-4 w-[76%]" />
            <Skeleton className="ml-auto size-4 shrink-0" />
          </div>
          <div className="atlas-document-meta">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-3.5 w-14" />
          </div>
          {secondLine ? (
            <div className="flex h-[27px] items-center">
              <Skeleton className="h-4 w-[52%]" />
            </div>
          ) : null}
          <div className="atlas-document-actions min-h-11 items-center">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        </div>
      </article>
    </li>
  );
}

function FilterSidebarSkeleton() {
  return (
    <aside className="atlas-filter-sidebar" aria-hidden>
      <div className="flex min-h-11 items-center justify-between gap-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="size-5 rounded" />
      </div>
      <div className="corpus-filter-form">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-4/5" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-24" />
          <div className="corpus-filter-options">
            {[0, 1, 2, 3, 4].map((key) => (
              <div
                key={key}
                className="flex min-h-[42px] items-center gap-2 px-2 -mx-2"
              >
                <Skeleton className="size-4 shrink-0 rounded-full" />
                <Skeleton className="h-3.5 flex-1" />
                <Skeleton className="h-3 w-6 shrink-0" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      </div>
    </aside>
  );
}

export function CorpusDocumentsSkeleton() {
  return (
    <div
      className="atlas-page"
      aria-busy="true"
      aria-label="Chargement de la bibliothèque documentaire"
    >
      <span className="sr-only" role="status">
        Chargement des publications…
      </span>
      <header className="corpus-workspace-heading" aria-hidden>
        <div className="min-w-0">
          <Skeleton className="h-[38px] w-[340px] max-w-full" />
          <Skeleton className="mt-3 h-[26px] w-[540px] max-w-full" />
        </div>
        <div className="corpus-workspace-summary">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-11 w-52" />
        </div>
      </header>
      <section className="atlas-discovery" aria-hidden>
        <SearchAreaSkeleton />
        <div className="atlas-catalogue-body">
          <FilterSidebarSkeleton />
          <div className="mt-7 min-w-0">
            <div className="atlas-result-toolbar">
              <div>
                <Skeleton className="h-[26px] w-40" />
                <Skeleton className="mt-1.5 h-3 w-64 max-w-full" />
              </div>
              <Skeleton className="hidden h-[50px] w-[92px] rounded-xl md:block" />
            </div>
            <ul className="atlas-results">
              {[0, 1, 2, 3, 4, 5].map((key) => (
                <DocumentRowSkeleton key={key} secondLine={key % 2 === 0} />
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

export function CorpusEntitiesSkeleton() {
  return (
    <div
      className="atlas-page"
      aria-busy="true"
      aria-label="Chargement du répertoire des entités"
    >
      <span className="sr-only" role="status">
        Chargement des entités…
      </span>
      <header className="atlas-page-intro" aria-hidden>
        <Skeleton className="h-[38px] w-[320px] max-w-full" />
        <Skeleton className="mt-3 h-[26px] w-[560px] max-w-full" />
      </header>
      <section className="atlas-discovery" aria-hidden>
        <SearchAreaSkeleton entities />
        <div className="mt-8">
          <Skeleton className="mb-5 h-4 w-24" />
          <ul className="atlas-entity-grid">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((key) => (
              <li key={key}>
                <div className="atlas-entity-card">
                  <Skeleton className="h-3.5 w-20" />
                  <div className="mt-[10px] mb-[15px] flex h-[30px] items-center">
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <Skeleton className="mb-[9px] h-3.5 w-2/5" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
