"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { readAtlas } from "./atlas-data";
import type { AtlasGraph } from "@/lib/corpus/types";

const API_KEYS = [
  "view",
  "q",
  "family",
  "year",
  "kind",
  "relationship",
  "focus",
  "hops",
  "orphans",
];

function useMedia(query: string) {
  const [matches, setMatches] = useState<boolean | null>(null);
  useEffect(() => {
    const media = matchMedia(query);
    const sync = () => setMatches(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [query]);
  return matches;
}

export function useAtlasWorkspace() {
  const search = useSearchParams();
  const router = useRouter();
  const mobile = useMedia("(max-width: 1023px)");
  const small = useMedia("(max-width: 767px)");
  const selected = search.get("selected") ?? "";
  const list = search.get("display") === "list";
  const view = search.get("view") === "relations" ? "relations" : "mentions";
  const returnFocus = useRef<HTMLElement | null>(null);
  const fallbackFocus = useRef<HTMLButtonElement>(null);
  const params = new URLSearchParams();
  API_KEYS.forEach((key) => {
    const value = search.get(key);
    if (value) params.set(key, value);
  });
  params.set("view", view);
  params.set("node_limit", small ? "120" : "300");
  params.set("edge_limit", small ? "240" : "600");
  const query = params.toString();
  const graph = useQuery({
    queryKey: ["atlas", query],
    queryFn: ({ signal }) =>
      readAtlas<AtlasGraph>(`/api/corpus/graph?${query}`, signal),
    enabled: mobile !== null && small !== null,
    placeholderData: keepPreviousData,
  });

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(search);
    Object.entries(changes).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key),
    );
    if (!("selected" in changes)) next.delete("selected");
    router.replace(`/brh-corpus/graph?${next}`, { scroll: false });
  }
  function choose(id: string) {
    if (
      !selected &&
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body
    )
      returnFocus.current = document.activeElement;
    const next = new URLSearchParams(search);
    next.set("selected", id);
    history.replaceState(null, "", `?${next}`);
  }
  function close() {
    const next = new URLSearchParams(search);
    next.delete("selected");
    history.replaceState(null, "", `?${next}`);
  }
  function restoreFocus() {
    const target = returnFocus.current;
    (target?.isConnected ? target : fallbackFocus.current)?.focus();
  }
  function toggleList() {
    const next = new URLSearchParams(search);
    if (list) next.delete("display");
    else next.set("display", "list");
    history.replaceState(null, "", `?${next}`);
  }
  function reset() {
    router.replace("/brh-corpus/graph", { scroll: false });
  }
  return {
    search,
    graph,
    mobile,
    selected,
    list,
    view,
    fallbackFocus,
    update,
    choose,
    close,
    restoreFocus,
    toggleList,
    reset,
  };
}
