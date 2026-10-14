# ADR-0004: Configurable embeddings, French-first corpus

- **Status**: Accepted
- **Date**: 2026-10-14

## Context

The BRH publications are **French**. Haitian Creole and English are roadmap
surfaces, not v1 requirements. Embedding quality for Haitian Creole is a
known low-resource problem, and we do not want to hard-code a provider we
might regret when the corpus grows or when a provider's pricing changes.

## Decision

Put embeddings behind `EMBEDDING_PROVIDER` and keep the corpus French-first:

| `BRH_EMBEDDING_PROVIDER` | Behaviour | Key needed |
|---|---|---|
| `pinecone` (default) | Pinecone integrated inference embeds server-side | Pinecone only |
| `openai` | Client-side embeddings via OpenAI-compatible API | OpenAI |
| `hashing` | Deterministic offline vectors — tests/dev only | none |

`BRH_EMBEDDING_MODEL` / `BRH_EMBEDDING_DIM` are read in every mode. The
vector-store layer (ADR-0006) accepts **text** and hides whether embedding
happened on the client or the server, so swapping providers is an env change,
not a code change.

Do **not** add automatic translation or cross-lingual claims in v1. Answer in
the language of the question, but do not promise Creole/English retrieval
quality the corpus cannot support.

## Consequences

Easier:

- Zero-friction default (integrated inference) and a graceful path to any
  other embedder.
- Tests run fully offline with the `hashing` provider.

Harder:

- The `pinecone` (integrated) and `openai` (client-side) paths imply different
  Pinecone index types. Documented in the deployment runbook; the operator
  picks one at index-creation time.
- A provider swap can require re-embedding the corpus. Acceptable: it is one
  CLI run from the stored page text.

## Alternatives considered

- **Hard-code OpenAI `text-embedding-3-large`.** Rejected: weaker on French
  than multilingual-e5 and locks us to one vendor.
- **Multilingual model for Creole now.** Deferred: no Creole corpus in v1.
