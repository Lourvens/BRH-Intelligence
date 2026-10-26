# ADR-0015 — Publish document snapshots independently of OCR workers

- Status: Accepted (user approved implementation, 2026-10-26)
- Extends and supersedes the live-filesystem read policy in ADR-0014

## Decision

Resolve shared relative data paths against an explicit data root, the discovered
root environment directory or workspace root. The Agent Server must find the
same artifacts as ingestion regardless of its working directory.

Read public document metadata and individual pages from a consistent Postgres
snapshot. Validated OCR input is published to an immutable artifact bundle before
its metadata/pages and active publication are promoted atomically. Local storage
is the development adapter; S3-compatible storage is an optional deployment
adapter. Existing stable document IDs and slugs are retained.

The PDF SHA identifies the original source, the Markdown hash identifies text
evidence, and the bundle hash identifies a publication including figures and
completion metadata. Asset URLs and Markdown downloads pin a publication.
Official PDF links retain their verified inventory origin.

Public graph evidence is checked against published text, not unpublished worker
files. A text change invalidates graph evidence on promotion; an asset-only
change does not invalidate identical text. Incomplete work or failed publication
leaves the previous publication readable. No automatic mixed-version fallback
is allowed. Serving pages requires neither an OCR mount nor a model/vector API.

## Consequences

An unpublished local edit is intentionally invisible to readers until sync.
Artifact storage must be backed up and available to every API replica serving
figures/downloads; pages remain readable if that storage is temporarily down.
Immutable bundles are retained; garbage collection requires a separate retention
policy. Current page text is stored once in existing research tables; historical
page-text navigation is not introduced by retaining old binary bundles.

No cloud bucket is provisioned by this decision. Operators select storage and
provide read-only API credentials and separate publisher write credentials.
