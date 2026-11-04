# ADR 0029 — Daily assistant token quota

## Status

Accepted.

## Context

The public assistant has per-minute request limits and a per-thread context
budget, but neither bounds a day of model spend. LangGraph custom auth can
resolve a request to an identity, and LangChain exposes exact provider usage in
`AIMessage.usage_metadata`, but LangGraph has no built-in per-user token quota.
There is no end-user login in the current product, so an account-scoped quota
is not yet available.

## Decision

1. **Anonymous identity from the trusted address.** `brh_agent.auth` uses
   LangGraph custom authentication and returns
   `request_identity(...)` in `langgraph_auth_user`. The identity is an HMAC of
   the client address using `BRH_QUOTA_IDENTITY_SALT`, so the ledger stores no
   raw IP. The same helper keys the existing request limiter.
2. **A Postgres ledger, not a mutable counter.** Migration
   `0009_assistant_daily_usage.sql` stores one row per completed turn with
   `(turn_id)` as the idempotency key. The daily total is a `SUM` over
   `(identity, usage_date)`. A replayed graph turn cannot double-charge, and no
   counter row can drift from its events.
3. **Exact usage, with an estimate fallback.** Chat models set
   `stream_usage=True`. Conversation, research, final-writer, and title calls
   read `usage_metadata` from the final chunk/message; the router and any
   provider that omits metadata fall back to
   `count_tokens_approximately`. `usage_commit` runs after title generation and
   writes the turn once.
4. **Admission at the HTTP boundary.** The existing `RateLimitMiddleware`
   checks today's ledger before a run and returns `429` with
   `subcode=daily_token_limit`, `window_seconds=86400`, and `Retry-After` until
   midnight UTC. The UI renders that as a day-scoped quota error with a corpus
   escape hatch rather than a short retry loop.
5. **Configuration.** `BRH_AGENT_DAILY_TOKEN_LIMIT` is the cap (`0` disables);
   `BRH_QUOTA_IDENTITY_SALT` is deployment-specific. Changing the salt starts
   fresh identities and therefore fresh counters.

## Consequences

- The quota is **per network address**, not per account. Users behind one NAT
  share it, and clearing nothing client-side can reset it. When authentication
  lands, the auth handler can return the account id and the ledger contract
  stays unchanged.
- The cap is intentionally soft: the request that crosses it completes, then
  later requests are denied. Exact hard admission would require reserving an
  estimate before the run, which the current one-container, low-volume service
  does not need.
- The ledger grows one row per assistant turn. It is indexed for daily reads
  and can be pruned by `usage_date` if retention becomes necessary.
- `BRH_RATE_LIMIT_ENABLED=false` disables the middleware path that performs the
  daily admission check. Keep it enabled in deployments that sell or meter
  assistant usage.
