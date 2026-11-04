"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SearchX } from "lucide-react";
import { CorpusRateLimitNotice } from "./corpus-rate-limit-notice";
import type { CorpusRateLimit } from "@/lib/corpus/rate-limit";

export function SearchFailure({
  semantic,
  query,
  rateLimit,
}: {
  semantic: boolean;
  query: Record<string, string>;
  rateLimit?: CorpusRateLimit | null;
}) {
  const router = useRouter();
  if (rateLimit) {
    const secondaryAction = rateLimit.subcode === "search"
      ? {
          label: "Rechercher par titre",
          onClick: () => {
            const next = new URLSearchParams(query);
            next.set("mode", "metadata");
            next.delete("page");
            router.push(`/brh-corpus?${next.toString()}`);
          },
        }
      : undefined;
    return (
      <CorpusRateLimitNotice
        rateLimit={rateLimit}
        surface="search"
        onRetry={() => router.refresh()}
        secondaryAction={secondaryAction}
        className="mt-7"
      />
    );
  }
  return (
    <div className="atlas-empty mt-7" role="alert">
      <SearchX size={32} />
      <h3>
        {semantic
          ? "La recherche par sens est indisponible"
          : "La recherche est temporairement indisponible"}
      </h3>
      <p>
        {semantic
          ? "Vous pouvez continuer à chercher dans les publications ou les passages."
          : "Vos critères sont conservés. Réessayez dans quelques instants."}
      </p>
      <Button variant="outline" onClick={() => router.refresh()}>
        Réessayer
      </Button>
    </div>
  );
}
