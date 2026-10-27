import { ArrowUpRight, Shapes, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { entityLabels } from "@/lib/corpus/labels";
import type { Entity } from "@/lib/corpus/types";
export function EntityResults({
  entities,
  pagination,
  query = {},
}: {
  entities: Entity[];
  pagination?: { total: number; page: number; page_size: number };
  query?: Record<string, string>;
}) {
  const link = (page: number) =>
    `/brh-corpus/entities?${new URLSearchParams({ ...query, page: String(page) })}`;
  return (
    <div className="mt-8">
      <p role="status" className="mb-5 text-small text-ink-muted">
        {pagination ? `${pagination.total} entités` : "Entités repérées"}
      </p>
      {entities.length ? (
        <ul className="atlas-entity-grid">
          {entities.map((e) => (
            <li key={e.entity_id}>
              <Link
                href={`/brh-corpus/entities/${e.entity_id}`}
                className="atlas-entity-card"
              >
                <span className="atlas-entity-icon">
                  <Shapes size={23} />
                </span>
                <span className="atlas-kicker">
                  {entityLabels[e.kind] ?? e.kind}
                </span>
                <h3>
                  {e.label}
                  <ArrowUpRight size={18} />
                </h3>
                <p>
                  {e.document_count} documents · {e.mention_count} mentions
                </p>
                <span className="text-caption text-ink-muted">
                  Consulter les passages sources
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="atlas-empty">
          <Shapes size={36} />
          <h3>Les entités restent à explorer</h3>
          <p>
            Aucune entité pour ces critères. L’extraction du graphe est
            distincte de la transcription des documents.
          </p>
          <Button asChild variant="outline">
            <Link href="/brh-corpus">Explorer les documents</Link>
          </Button>
        </div>
      )}
      {pagination && pagination.total > pagination.page_size && (
        <nav aria-label="Pagination des entités" className="atlas-pagination">
          {pagination.page > 1 ? (
            <Button asChild variant="outline">
              <Link href={link(pagination.page - 1)}>
                <ArrowLeft size={16} />
                Précédente
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <span>
            Page {pagination.page} sur{" "}
            {Math.ceil(pagination.total / pagination.page_size)}
          </span>
          {pagination.page * pagination.page_size < pagination.total ? (
            <Button asChild variant="outline">
              <Link href={link(pagination.page + 1)}>
                Suivante
                <ArrowRight size={16} />
              </Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
