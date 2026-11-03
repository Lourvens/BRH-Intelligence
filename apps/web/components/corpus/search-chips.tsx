"use client";

import { X } from "lucide-react";
import {
  CATALOGUE_CHIP_KEYS,
  catalogueChipLabel,
  isActiveFilterValue,
} from "@/lib/corpus/filters";

export function SearchChips({
  filters,
  onRemove,
}: {
  filters: Record<string, string>;
  onRemove: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATALOGUE_CHIP_KEYS.filter((key) =>
        isActiveFilterValue(filters[key]),
      ).map((key) => (
        <button
          type="button"
          className="atlas-chip"
          key={key}
          onClick={() => onRemove(key)}
        >
          {catalogueChipLabel(key, filters[key])}
          <X size={13} />
          <span className="sr-only">Retirer le filtre</span>
        </button>
      ))}
    </div>
  );
}
