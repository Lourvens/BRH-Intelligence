---
name: code-organization
description: Keep code files under the 250-line cap, apply DRY without premature abstraction, and organize Python and React/Next code by concern. Use when adding, refactoring or reviewing code, or when a commit is blocked by the line-limit hook.
---

# code-organization

Keep files small, cohesive and non-repetitive. The pre-commit hook blocks any
staged code file over 250 lines; this skill is the playbook for passing it
without hollowing out the design.

## when to apply

- Before writing a new module, component, hook or endpoint.
- When a file approaches 250 lines or already exceeds it.
- When the same logic, constant, type, validation or formatting appears a
  second or third time.
- When a commit is blocked by `.claude/hooks/precommit-line-limit.sh`.

## hard rules

1. **250 lines max per code file** (`py`, `ts`, `tsx`, `js`, `jsx`, `mjs`,
   `cjs`). No exceptions, no baselines. If a concern genuinely needs more, it is
   several concerns.
2. **One concern per file.** A file should have one reason to change. Route and
   page files compose; they do not implement.
3. **Rule of three.** Abstract on the third copy, or immediately when two copies
   already diverge in a way that causes bugs. Do not abstract coincidental
   similarity.
4. **Duplicate knowledge, not lines.** Constants, schemas, validation,
   formatting, error messages, model settings and API shapes have one home.
   Similar-looking JSX or two-line loops are not duplication.
5. **Delete before abstracting.** Remove dead code and unused exports before
   adding a shared module.

## splitting a file that is over 250

Find seams in this order; stop as soon as the file fits:

1. **Constants and configuration** -> `constants.ts`, `_constants.py` or the
   existing settings module.
2. **Types and schemas** -> `types.ts`, `models.py`, `schemas.py`.
3. **Pure helpers** -> `*.helpers.ts`, `_helpers.py`. No React, no I/O.
4. **Stateful logic** -> `use-*.ts`, or a service/repository function.
5. **Presentational pieces** -> sibling components (`*.cells.tsx`,
   `*Card.tsx`).
6. **The orchestrator stays**: it wires imports, owns the top-level state and
   renders.

After the split:

- Every touched file is <= 250 lines (`wc -l`).
- No import cycles; dependencies point one way.
- `make lint` and the focused tests pass.
- Behaviour is unchanged.

## python

- Organize by feature/domain (`ingestion/`, `retrieval/`, `inventory/`), not by
  technical layer at the top level.
- One concept per module: `chunk.py` is a facade; `chunking/blocks.py`,
  `strategy.py` and `tables.py` own their pieces.
- Keep business logic pure and separate from I/O; inject repositories and
  clients instead of importing a global connection.
- Centralize settings in `brh_core.config.Settings`; never hardcode timeouts,
  retries, model names, limits or secrets.
- Retry at one layer only; do not stack a client retry under an application
  retry.
- Public package surfaces declare `__all__`; internal helpers stay private by
  omission.
- Use absolute imports (`from brh_core...`), not relative ones.
- Frozen pydantic models: build new instances instead of mutating.
- Catch specific exceptions, log with context, never `except Exception: pass`.
- Surfaces (`brh_agent`, `brh_mcp`) go through `RetrievalService`; no direct
  Pinecone/Postgres reads.

## react and next.js

- `app/**/page.tsx`, `layout.tsx` and `route.ts` are thin: fetch or compose and
  delegate. Feature code lives in `components/<domain>/` and `lib/`.
- Server Components by default. Add `"use client"` only at the interactive
  leaf, never on a whole route for one hook.
- One component per file; typed props; no business logic inline in JSX.
- Extract stateful logic to `lib/hooks/use-*.ts`; pure formatting and mapping to
  `lib/<domain>/*.ts`.
- Colocate state with its consumer; derive instead of storing; update
  immutably.
- Shared primitives stay in `components/ui` (shadcn). Do not fork a primitive
  into a feature folder.
- Charts: visx for <= 6 brand-critical series, ECharts for dense or multi-type
  data; no hand-rolled SVG geometry.
- Split a large page as orchestrator + `use-<feature>.ts` +
  `<feature>.helpers.ts` + focused sibling components.

## pre-commit checklist

- [ ] `wc -l` every touched code file; all <= 250.
- [ ] New shared helper exists once; no second copy of the same rule, constant
      or type.
- [ ] No import cycle and no layer inversion.
- [ ] `make lint` clean.
- [ ] `make test` (or the focused pytest/bun target) green.
