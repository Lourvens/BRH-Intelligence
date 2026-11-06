# ADR-0032: Assistant error surfaces match the scope of the failure

Status: Accepted

## Context

The assistant stream (`@langchain/langgraph-sdk` `useStream`) surfaces every
transport failure through one `onError` callback. Those failures are not the
same thing:

- a **404** means the destination is gone — an expired or deleted conversation,
  or an assistant id/endpoint that this deployment does not serve;
- a **401/403** means the caller may not use the destination;
- a **422/400** means the request itself was refused;
- a **429** or **5xx** means the service is temporarily saturated or down;
- a **network error** means the browser never reached the service.

The UI collapsed all of them into one sentence, "L'assistant est momentanément
indisponible", and offered "Réessayer". For a 404 that sentence is false and the
button can never succeed: retrying a conversation the server does not have
reproduces the 404 forever. On top of that, a dead deep link looked like an
empty chat with a composer, inviting exactly that loop.

## Decision

Classify the error before drawing it, and let the scope decide the surface.

| Failure | Kind | Surface | Recovery |
|---|---|---|---|
| 404 conversation | `not_found` / thread | panel when the transcript is empty, inline when it is not | new conversation, explore corpus, forget the stale entry |
| 404 run | `not_found` / run | inline | retry, new conversation |
| 404 assistant or endpoint | `not_found` / assistant, service | panel | reload, retry |
| 401/403 | `forbidden` | panel when empty, inline otherwise | reload (renew session) |
| 400/405/406/413/415/422 | `invalid` | inline | edit the question |
| 408/5xx | `unavailable` | inline | retry, honouring `Retry-After` |
| 429 | `rate_limit` | inline | countdown, edit, corpus |
| network | `connection` | inline | retry |

Rules that follow from the table:

1. **HTTP status is authoritative**; text fallbacks exist only for SDK errors
   that lose the status (`Error("Failed to stream: Not Found")`).
2. **A missing destination is not retryable.** The panel never shows
   `Réessayer`; recovery is a new conversation or a reload.
3. **Destination errors take over the workspace** (`AssistantErrorPanel`) when
   there is no transcript, and hide the composer, so the user cannot submit into
   a dead thread. With a transcript on screen the failure stays inline and the
   conversation is preserved.
4. **Turn errors stay inline** next to their question, keeping the composer
   available.
5. **The UI owns the copy.** Server text is displayed only for rate limits
   (`error.message`); every other kind is written in
   `assistant-error-presentation.ts`. A short `Erreur 404`-style reference is
   kept for support.
6. **`Retry-After` drives the cooldown** for 429 and for 503-style outages.
7. **Local history is not pruned automatically.** A deployment misconfiguration
   can 404 every thread; the panel only removes an entry when the user asks.

## Consequences

- The classification lives in `lib/chat/assistant-error.ts`, the view model in
  `lib/chat/assistant-error-presentation.ts`; both are pure and unit-tested, and
  the notice and panel consume the same actions so they cannot drift.
- Copy is French and product-level: no stack traces, no raw server detail. The
  status code is secondary (muted eyebrow), never the headline.
- A 404 is treated as definitive. If the backend ever returns 404 for a
  transient reason, the user gets a new-conversation path instead of a retry:
  recoverable, but it loses the answer they were waiting for.
- The SDK rejects its internal history promise after it has already reported the
  error through `onError`; this produces an unhandled rejection in the console
  for any history failure, independent of this decision.
- Reading `Retry-After` from the browser requires the agent service to expose
  the header through CORS (`access-control-expose-headers: retry-after`);
  without it the cooldown falls back to the server's body field or to zero.
- Retrying an outage relies on the question being restored in the composer; a
  failed 404 turn has no retry, so the user retypes.
