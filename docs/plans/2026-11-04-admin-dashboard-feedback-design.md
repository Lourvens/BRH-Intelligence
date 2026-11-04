# Admin dashboard and user feedback

## Outcome

Give the operator a private view of corpus availability, recorded assistant
usage, ingestion work and user reports. Let a visitor submit feedback without
creating an account, either about the app or a particular assistant answer.

## Scope and approach

An operational dashboard inside the existing Next.js app is preferable to an
external analytics dashboard: feedback triage and the existing corpus ledger
belong together. A full account/roles system adds an identity lifecycle this
single-operator app does not yet need. External traces remain in LangSmith;
the dashboard must not imply it measures errors, latency or costs.

- `/admin`: server-protected overview and paginated feedback inbox.
- `/admin/login`: operator access key, encrypted eight-hour cookie session.
- Feedback dialog in the assistant header and answer actions.
- French interface using existing typography, semantic tokens and shadcn.
- Reuse installed libraries; add iron-session for maintained session encryption.

## Data and security

Postgres stores feedback, category, status, timestamps and internal notes.
Answer excerpts are submitted only with explicit consent. No conversation is
automatically fetched. Anonymous submission identity is HMAC-derived and never
returned in admin responses. A transactional per-identity hourly quota limits
feedback abuse. Input lengths and local page paths are validated server-side.

The web server alone holds `BRH_ADMIN_API_TOKEN`, shared with the agent server.
Every operations endpoint requires that bearer token. The browser uses an
independent `BRH_ADMIN_PASSWORD`; `BRH_ADMIN_SESSION_SECRET` encrypts its cookie.
Missing configuration disables access. Session checks run in the page and
every private API route. Mutations verify same origin; sessions are HttpOnly,
SameSite Strict and Secure in production. Credentials are never sent to client
components. Login attempts have a bounded local throttle; production ingress
should also rate-limit the login path across replicas.

Overview data comes from the core operations repository and RetrievalService.
Usage is explicitly recorded completed turns/tokens from the existing quota
ledger, not unique people or total requests. Counts can be incomplete while
quota accounting is disabled. Unavailable dependencies produce an explicit
unavailable state rather than fabricated zero metrics.

## Implementation milestones

1. Commit this design and architecture decision.
2. Add database migration, operations services and authenticated HTTP routes.
3. Add protected web sessions/proxies, feedback dialog and admin workspace.
4. Verify offline contracts, auth and unhappy paths, TypeScript and browser flows;
   commit the working integration with setup documentation.

## Verification

Test authentication denial, missing configuration, session tampering/expiry,
same-origin mutation protection, input validation, pagination, status changes
and feedback throttling. Browser checks cover login/logout, submission,
feedback review, mobile layout and reduced motion. No deployment or live
database migration is part of this change.

## Completed verification

- Offline Python regression suite: 385 passed, 14 integration tests deselected.
- Ruff: clean. Frontend library tests: 75 passed across the full library suite
  and the three added streamed-request-boundary tests.
- TypeScript and isolated optimized production build: passed.
- Production-build Playwright checks: six passed across desktop and mobile.
  They verify anonymous denial, same-origin protection, valid/expired/revoked/
  tampered sessions, feedback failure recovery and submission, review state and
  notes, filtering, pagination, logout, keyboard focus and reduced motion.
- Desktop and mobile dashboard screenshots inspected; no viewport overflow.
- Bun frozen-lockfile install unchanged; deployment YAML locks independently
  checked against the resolved package graph and integrity hashes.
- All 50 committed code files in the first two implementation milestones
  remain within the 250-line cap; browser test and fixture also comply.

Browser operations use an in-memory test service. SQL repositories are covered
by offline fakes; no live database migration or deployment was performed.
