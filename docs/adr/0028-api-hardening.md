# ADR 0028 — API hardening for the public agent service

## Status

Accepted.

## Context

The Modal deployment exposes the LangGraph Agent Server, the research corpus
routes, and the browser stream from a single public URL. Without limits, a
client can create runs repeatedly, grow a thread without bound, or call the
service from any origin.

The deployment is currently one Modal container (`max_containers=1`) and is
expected to move to a hosted Agent Server later.

## Decision

1. **One Starlette security layer.** `brh_agent.middleware.security` installs a
   `RateLimitMiddleware` and `CORSMiddleware` on the custom app loaded by
   `langgraph.json`. LangGraph runs custom middleware for both its built-in
   `/threads`, `/runs`, `/assistants`, and `/store` routes and the custom
   `/corpus/v1/*` routes. This is the server-layer convention; LangChain's
   `AgentMiddleware` hooks belong to `create_agent`, while this project uses a
   hand-built `StateGraph`.
2. **Per-IP sliding windows.** Limits are configurable with
   `BRH_RATE_LIMIT_*`: a global safety cap, an agent API cap, a tighter
   agent-run cap, a corpus cap, and a semantic-search cap. Health, docs, and
   preflight requests are exempt. Responses expose `X-RateLimit-*` and
   `Retry-After`.
3. **Explicit CORS allowlist.** The browser origin is
   `https://brh-intelligence.vercel.app`; local development adds
   `http://localhost:3000`. Both `CORS_ALLOW_ORIGINS` (LangGraph) and
   `BRH_CORS_ALLOWED_ORIGINS` (the custom app) are environment-driven.
4. **Per-thread context budget.** A `context_guard` node runs before routing.
   It removes old messages with `RemoveMessage`, using
   `BRH_AGENT_MAX_CONTEXT_TOKENS` and `BRH_AGENT_MAX_CONTEXT_MESSAGES`, so the
   budget is enforced in the checkpointer state rather than only at one model
   call.
5. **Proxy-aware client identity.** Behind Modal, the limiter reads the
   right-most `X-Forwarded-For` hop when `BRH_RATE_LIMIT_TRUST_PROXY=true`.
   This must not be enabled behind an untrusted proxy.

## Consequences

- The in-memory limiter is per process and resets on a cold start. It matches
  the current single-container deployment; a multi-replica deployment needs a
  shared Redis/Postgres limiter.
- The context guard permanently removes old messages from the thread state.
  That keeps the budget predictable without adding a summarizer, but loses
  verbatim history beyond the configured window.
- The allowlist is exact-origin only. Preview deployment URLs need an explicit
  environment change rather than a wildcard.
