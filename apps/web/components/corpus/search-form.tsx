"use client";

import { LoaderCircle, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { entityLabels, familyLabels } from "@/lib/corpus/labels";
import type { Facets } from "@/lib/corpus/types";
import { useCorpusSearch } from "@/lib/hooks/use-corpus-search";

function FilterFields({ query, facets, id, mode, setQuery }: {
  query: Record<string, string>; facets: Facets; id: string; mode: string;
  setQuery: (query: Record<string, string>) => void;
}) {
  return <div className="space-y-5">
    {mode === "entities" ? <div className="space-y-2">
      <label htmlFor={`${id}-kind`} className="text-caption font-semibold text-ink-muted">Type d’entité</label>
      <Select value={query.kind || "all"} onValueChange={(kind) => { if (kind) setQuery({ ...query, kind }); }}><SelectTrigger id={`${id}-kind`} className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="all">Tous les types</SelectItem>{Object.entries(entityLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
      </Select>
    </div> : <>
      <div className="space-y-2">
        <label htmlFor={`${id}-family`} className="text-caption font-semibold text-ink-muted">Famille documentaire</label>
        <Select value={query.family || "all"} onValueChange={(family) => { if (family) setQuery({ ...query, family }); }}><SelectTrigger id={`${id}-family`} className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Toutes les familles</SelectItem>{facets.families.map((item) => <SelectItem key={item.family} value={item.family}>{familyLabels[item.family] ?? item.family} ({item.count})</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label htmlFor={`${id}-year`} className="text-caption font-semibold text-ink-muted">Année de la période couverte</label>
        <Select value={query.year || "all"} onValueChange={(year) => { if (year) setQuery({ ...query, year }); }}><SelectTrigger id={`${id}-year`} className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Toutes les périodes</SelectItem>{facets.years.map((year) => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label htmlFor={`${id}-sort`} className="text-caption font-semibold text-ink-muted">Ordre des résultats</label>
        <Select value={query.sort || "title"} onValueChange={(sort) => { if (sort) setQuery({ ...query, sort }); }}><SelectTrigger id={`${id}-sort`} className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="title">Titre A–Z</SelectItem><SelectItem value="period">Période la plus récente</SelectItem><SelectItem value="recent">Dernière synchronisation</SelectItem></SelectContent>
        </Select>
      </div>
    </>}
    <p className="text-caption leading-5 text-ink-muted">La période couverte est distincte de la date de mise en ligne. Les métadonnées inconnues restent visibles sans filtre.</p>
  </div>;
}

export function CorpusSearchForm({ query, facets }: { query: Record<string, string>; facets: Facets }) {
  const { mode, setMode, pending, submit } = useCorpusSearch(query.mode ?? "metadata");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [filters, setFilters] = useState(query);
  return <form action="/brh-corpus" method="get" onSubmit={submit} className="space-y-5" aria-label="Rechercher dans le corpus" aria-busy={pending}>
    <input type="hidden" name="mode" value={mode} />
    {(mode === "entities" ? ["kind"] : ["family", "year", "sort"]).map((name) => <input key={name} type="hidden" name={name} value={filters[name] === "all" ? "" : filters[name] ?? ""} />)}
    {query.entity_id ? <input type="hidden" name="entity_id" value={query.entity_id} /> : null}
    {query.document_id ? <input type="hidden" name="document_id" value={query.document_id} /> : null}
    <div className="flex gap-2">
      <label htmlFor="corpus-search" className="sr-only">Titre, référence, passage ou entité</label>
      <Input id="corpus-search" name="q" maxLength={300} defaultValue={query.q ?? ""} placeholder={mode === "entities" ? "Rechercher une institution, un indicateur…" : "Rechercher un titre, une référence ou un passage…"} className="h-12 rounded-sm bg-surface text-small" />
      <Button type="submit" aria-label={pending ? "Recherche en cours" : "Rechercher"} className="h-12 rounded-sm px-4" disabled={pending}>
        {pending ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <Search className="size-4" aria-hidden />}<span className="hidden sm:inline">Rechercher</span>
      </Button>
    </div>
    <Tabs value={mode} onValueChange={setMode}>
      <TabsList variant="line" className="w-full justify-start gap-4 overflow-x-auto">
        <TabsTrigger value="metadata">Titres et références</TabsTrigger><TabsTrigger value="text">Texte des pages</TabsTrigger><TabsTrigger value="semantic">Par sens</TabsTrigger><TabsTrigger value="entities">Entités</TabsTrigger>
      </TabsList>
    </Tabs>
    <div className="hidden lg:block"><FilterFields key={`${mode}-desktop`} query={filters} setQuery={setFilters} facets={facets} id="desktop" mode={mode} /></div>
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetTrigger asChild><Button type="button" variant="outline" className="w-full rounded-sm lg:hidden"><SlidersHorizontal className="size-4" aria-hidden />Filtres et tri</Button></SheetTrigger>
      <SheetContent side="left" className="overflow-y-auto bg-surface">
        <SheetHeader><SheetTitle>Affiner la recherche</SheetTitle><SheetDescription>Choisissez les critères avant de lancer la recherche.</SheetDescription></SheetHeader>
        <div className="px-4"><FilterFields key={`${mode}-mobile`} query={filters} setQuery={setFilters} facets={facets} id="mobile" mode={mode} />
          <Button type="button" className="mt-6 w-full" onClick={() => setMobileOpen(false)}>Conserver les filtres</Button>
        </div>
      </SheetContent>
    </Sheet>
    <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
      <Link href="/brh-corpus" className="text-caption text-teal underline underline-offset-4">Réinitialiser</Link>
      <Button type="submit" size="sm" variant="outline" disabled={pending} className="rounded-sm">{pending ? "Recherche…" : "Appliquer"}</Button>
    </div>
    <p role="status" className="sr-only">{pending ? "Recherche en cours." : ""}</p>
  </form>;
}
