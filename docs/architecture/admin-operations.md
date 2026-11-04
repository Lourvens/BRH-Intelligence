# Administration and feedback

The private dashboard at `/admin` combines corpus statistics/readiness,
30 UTC days of recorded assistant usage, ingestion job history and user feedback.
It uses the existing Next.js and Python services; no analytics provider is
required. Public feedback controls live in the assistant header and answer
actions. Answer excerpts are explicitly opt-in and capped at 2,000 characters.
Feedback automatically includes the active conversation ID when available;
the admin review shows that ID and a link to open the conversation.
The web runtime requires Node.js 22.13 or newer for iron-session 9; verification
uses Node.js 24.

## Enable

1. Apply the append-only migration with `make migrate` against the intended
   database. Migration `0010_user_feedback.sql` creates the feedback table.
2. Set an independently generated `BRH_ADMIN_API_TOKEN` of at least 32 random
   characters in both the Python agent and the Next.js server environments.
3. On Next.js, set `BRH_ADMIN_PASSWORD` (at least 16 characters) and a separate
   `BRH_ADMIN_SESSION_SECRET` (at least 32 random characters). These are
   server-only variables; never use a `NEXT_PUBLIC_` prefix.
4. Set `BRH_CORPUS_API_URL` to the agent base URL, as for corpus proxies.
5. Set `BRH_WEB_TRUST_PROXY=true` only if the frontend host replaces incoming
   `X-Forwarded-For` with a trusted client address. Otherwise visitors share a
   conservative fallback identity and hourly feedback quota.
6. Restart both services and open `/admin/login`. Use the operator access key.

Generate each secret independently, for example with
`openssl rand -base64 48`. Keep the access key in a password manager.
Feedback works with just the shared API token; the password and session secret
are needed only for the private dashboard. Neither existing public corpus
access nor assistant questions require an admin session.

## Security and lifecycle

iron-session encrypts an eight-hour HttpOnly cookie with SameSite Strict and
Secure in production. Every dashboard page and private proxy checks the
session; every upstream operations endpoint checks the bearer token. Mutations
require a matching Origin. Changing the access key invalidates existing
sessions on the next request; changing the session secret also invalidates
cookies. Logout clears the browser cookie; a previously copied cookie remains
valid until expiry or credential rotation. Sign-in allows eight attempts per address
per fifteen minutes in each web process. Configure a distributed host/WAF limit
on `/api/admin/login` in production; the process-local limit does not span
replicas. Trusting user-controlled forwarding headers would defeat address
limits, which is why proxy trust is explicit.

Postgres serializes feedback admissions per HMAC identity using an advisory
transaction lock. `BRH_FEEDBACK_HOURLY_LIMIT` defaults to five submissions per
rolling hour. Raw addresses are not stored or returned. Feedback messages,
optional excerpts, page paths and thread IDs are visible only in the private
inbox. Internal notes are never returned by public submission acknowledgments.
Feedback is retained until the operator applies their database retention
policy; there is no automatic deletion or email follow-up in this version.

The API starts with the shared retrieval Postgres pool, so a database outage
can prevent startup. Pinecone clients initialize lazily. Once running,
individual corpus snapshot failures appear as unknown status while other
operational data remains available. A failed overview or inbox load displays
an explicit unavailable state.

## Metric interpretation

- Turns and tokens come from `corpus.assistant_daily_usage`, not HTTP logs.
  They cover completed turns that recorded positive consumption while quota
  accounting was enabled. Zero does not prove that nobody used the assistant.
- Anonymous identities are address-scoped quota identities, not people or
  accounts. Shared networks and address changes affect their count.
- Job status counts cover the whole ingestion ledger. The recent list is
  bounded to ten records. Error counts include historical failures, even when
  later attempts succeeded. Raw exception details stay out of the dashboard.
- Readiness reports publications/storage, not a live model or Pinecone probe.
- Latency, request error rate and spending are not measured by this dashboard.

## Local verification

Focused backend checks:

```bash
uv run pytest packages/core/tests/test_operations_feedback.py packages/core/tests/test_operations_metrics.py services/agent/tests/test_operations_http.py services/agent/tests/test_operations_lifecycle.py
bun test apps/web/lib/admin apps/web/lib/feedback
bun run --cwd apps/web typecheck
```

Browser tests use an explicitly isolated in-memory operations fixture; they
never write to the live corpus database. Start it in one terminal:

```bash
bun apps/web/tests/support/operations-server.ts
```

Start a separate web process with test-only credentials in another terminal:

```bash
BRH_WEB_TEST_BUILD=true \
BRH_ADMIN_PASSWORD=test-admin-password-2026 \
BRH_ADMIN_SESSION_SECRET=local-browser-test-session-secret-32chars \
BRH_ADMIN_API_TOKEN=local-browser-test-backend-token-32chars \
BRH_CORPUS_API_URL=http://127.0.0.1:2025 \
bun run --cwd apps/web dev --port 3100
```

Then run `BRH_WEB_TEST_URL=http://localhost:3100 bun run --cwd apps/web test:e2e admin-feedback.spec.ts`.
Separate `.next-tests` build artifacts allow this verification alongside the
regular local dev server.
