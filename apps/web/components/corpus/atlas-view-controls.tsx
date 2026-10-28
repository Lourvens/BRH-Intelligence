"use client";

import type { Ref } from "react";
import { List, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AtlasViewControls({
  view,
  list,
  focus,
  hops,
  update,
  toggleList,
  listRef,
}: {
  view: string;
  list: boolean;
  focus: string;
  hops: string;
  update: (changes: Record<string, string>) => void;
  toggleList: () => void;
  listRef: Ref<HTMLButtonElement>;
}) {
  return (
    <div className="atlas-map-view">
      <Select
        value={view}
        onValueChange={(value) => {
          if (value === "relations")
            update({
              view: value,
              focus: focus.startsWith("entity:") ? focus : "",
              orphans: "",
            });
          else if (value) update({ view: value, focus: "", relationship: "" });
        }}
      >
        <SelectTrigger aria-label="Vue du graphe">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="mentions">Documents et entités</SelectItem>
          <SelectItem value="relations">Relations documentées</SelectItem>
        </SelectContent>
      </Select>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            ref={listRef}
            aria-label={list ? "Afficher la carte" : "Afficher la liste"}
            aria-pressed={list}
            onClick={toggleList}
          >
            {list ? <Network size={17} /> : <List size={17} />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{list ? "Carte" : "Liste accessible"}</TooltipContent>
      </Tooltip>
      {focus && (
        <div className="atlas-map-neighborhood">
          <span className="text-caption text-ink-muted">Vue locale</span>
          <Select
            value={hops || "1"}
            onValueChange={(value) => value && update({ hops: value })}
          >
            <SelectTrigger aria-label="Profondeur du graphe">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 niveau</SelectItem>
              <SelectItem value="2">2 niveaux</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            onClick={() => update({ focus: "", hops: "" })}
          >
            Vue globale
          </Button>
        </div>
      )}
    </div>
  );
}
