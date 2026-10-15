-- Inventory resume cursor (design: docs/plans/2026-10-14-brh-inventory-design.md).
--
-- Bounded runs (`--limit N`) and scheduled runs must continue where the last
-- run stopped instead of re-scanning from the start. This table holds one
-- cursor per scope: the (modified, url) of the last document that was fully
-- resolved, in the modified-ascending order the inventory walks.
--
-- The cursor only advances past *resolved* documents, so a URL that failed is
-- retried on the next run; and because a changed document's `modified` moves
-- forward, updates surface naturally at the far end of the ordering.

CREATE TABLE IF NOT EXISTS corpus.sync_state (
    scope           TEXT PRIMARY KEY,
    cursor_modified TIMESTAMPTZ,
    cursor_url      TEXT,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
