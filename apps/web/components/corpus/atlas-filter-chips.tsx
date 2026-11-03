"use client";

import { X } from "lucide-react";
import { activeAtlasFilters } from "@/lib/corpus/filters";

export function AtlasFilterChips({
  search,
  update,
}: {
  search: Pick<URLSearchParams, "get">;
  update: (changes: Record<string, string>) => void;
}) {
  return (
    <div className="atlas-map-chips" aria-label="Critères actifs">
      {activeAtlasFilters(search).map(({ key, label }) => (
        <button
          key={key}
          onClick={() => update({ [key]: "" })}
          aria-label={`Retirer le filtre : ${label}`}
          title={label}
        >
          <span>{label}</span>
          <X size={13} aria-hidden />
        </button>
      ))}
    </div>
  );
}
