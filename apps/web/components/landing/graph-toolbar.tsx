import type { FormEvent } from "react";

import { LandingIcon } from "./icons";

type GraphToolbarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  showDocumented: boolean;
  showProposed: boolean;
  onToggleDocumented: () => void;
  onToggleProposed: () => void;
  view: "graph" | "list";
  onViewChange: (view: "graph" | "list") => void;
};

export function GraphToolbar({
  query,
  onQueryChange,
  onSearch,
  showDocumented,
  showProposed,
  onToggleDocumented,
  onToggleProposed,
  view,
  onViewChange,
}: GraphToolbarProps) {
  return (
    <div className="graph-toolbar">
      <form onSubmit={onSearch}>
        <label htmlFor="graph-search">Rechercher un nœud</label>
        <div>
          <LandingIcon name="search" size={16} />
          <input
            id="graph-search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="BRH, CEC, circulaire…"
          />
        </div>
      </form>
      <div className="graph-status-filters">
        <button
          className="documented"
          aria-pressed={showDocumented}
          onClick={onToggleDocumented}
        >
          <i /> Mentions
        </button>
        <button
          className="proposed"
          aria-pressed={showProposed}
          onClick={onToggleProposed}
        >
          <i /> Proposées
        </button>
        <button className="validated" disabled>
          <i /> Validées · 0
        </button>
      </div>
      <div className="graph-view-toggle">
        <button
          aria-pressed={view === "graph"}
          onClick={() => onViewChange("graph")}
        >
          Graphe
        </button>
        <button
          aria-pressed={view === "list"}
          onClick={() => onViewChange("list")}
        >
          Liste
        </button>
      </div>
    </div>
  );
}
