"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SearchX } from "lucide-react";
export function SearchFailure({ semantic }: { semantic: boolean }) {
  const router = useRouter();
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
