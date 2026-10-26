export type ResearchDocument = {
  document_id: string; sha256: string; artifact_hash: string; slug: string;
  publication_id: string | null; published_at: string | null;
  title: string; family: string; period_label: string | null; period_years: number[];
  publication_date: string | null; date_basis: string; uploaded_at: string | null;
  source_urls: string[]; page_count: number; figure_count: number; synced_at: string;
  entity_count: number; relationship_count: number; match_page: number | null; snippet: string | null;
};
export type DocumentPage = {
  document_id: string; slug: string; title: string; artifact_hash: string;
  publication_id: string | null; published_at: string | null; source_sha256: string;
  page_number: number; page_count: number; markdown: string; pdf_url: string | null;
};
export type CorpusStats = {
  discovered_urls: number; readable_documents: number; readable_pages: number;
  entities: number; graph_documents: number; relationships: number;
  processed_documents: number; as_of: string | null;
  indexed_documents: number | null; indexed_vectors: number | null;
};
export type Entity = {
  entity_id: string; label: string; kind: string; aliases: string[];
  document_count: number; mention_count: number;
};
export type Evidence = {
  document_id: string; slug: string; title: string; page_number: number;
  quote: string; artifact_hash: string; pdf_url: string | null;
};
export type GraphEdge = {
  assertion_id: string; subject_id: string; object_id: string; predicate: string;
  temporal_context: string | null; evidence: Evidence;
};
export type GraphResult = { nodes: Entity[]; edges: GraphEdge[]; truncated: boolean; hops: number };
export type DocumentList = { items: ResearchDocument[]; total: number; page: number; page_size: number; bounded?: boolean };
export type Facets = { families: { family: string; count: number }[]; years: number[] };
export type SearchParams = Record<string, string | string[] | undefined>;
export type CatalogueData = {
  query: Record<string, string>; documents: DocumentList; entities: Entity[];
  facets: Facets; stats: CorpusStats;
};
