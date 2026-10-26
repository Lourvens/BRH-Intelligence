"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CorpusUnavailable({ invalid = false, document = false, status }: { invalid?: boolean; document?: boolean; status?: number }) {
  return (
    <div role="alert" className="mx-auto max-w-xl border border-border bg-surface p-8 text-center">
      <AlertCircle className="mx-auto mb-4 size-6 text-ink-muted" aria-hidden />
      <h1 className="font-display text-xl font-semibold text-navy-ink">{invalid ? "Recherche non valide" : document ? status === 409 ? "Document en cours de publication" : "Ce document est temporairement indisponible" : "Le corpus est temporairement indisponible"}</h1>
      <p className="mt-3 text-small text-ink-muted">{invalid ? "Vérifiez les filtres et le numéro de page." : document ? "Réessayez cette page ou consultez un autre document dans le corpus." : "Vos critères restent dans l’adresse. Réessayez dans quelques instants."}</p>
      {!invalid ? <Button type="button" variant="outline" className="mt-6" onClick={() => window.location.reload()}>Réessayer avec ces critères</Button> : null}
      <Link href="/brh-corpus" className="mt-6 block text-small text-teal underline underline-offset-4">Revenir au catalogue</Link>
    </div>
  );
}
