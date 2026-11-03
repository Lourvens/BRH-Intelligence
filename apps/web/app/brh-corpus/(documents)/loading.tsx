import { Skeleton } from "@/components/ui/skeleton";

export default function CorpusLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Chargement du corpus"
      className="mx-auto max-w-7xl space-y-6 px-5 py-16"
    >
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-16 w-full" />
      {[0, 1, 2, 3].map((key) => (
        <Skeleton key={key} className="h-28 w-full" />
      ))}
    </div>
  );
}
