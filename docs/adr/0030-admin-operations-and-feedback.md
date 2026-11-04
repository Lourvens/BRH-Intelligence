# ADR-0030: Private operations dashboard and durable user feedback

Status: Accepted

## Context

The public assistant has anonymous address-scoped identities and no account
system. The operator needs visibility into existing corpus and usage ledgers,
plus a durable feedback workflow.

## Decision

Store feedback in the shared Postgres core with validated categories, three
review states and an internal note. Expose operations through bearer-protected
agent HTTP routes. The Next.js server proxies these routes after checking an
encrypted, expiring operator session. Public feedback submissions pass through
the web server and a transactional hourly quota. Answer text is opt-in.

Use iron-session for cookie encryption rather than implementing a session
cryptographic format. Separate the operator password, session encryption
secret and backend bearer token. Disable access when configuration is absent.

Reuse RetrievalService for corpus views and aggregate existing usage/job
ledgers. Do not add model calls or expose raw conversation, address or error
payloads. Display missing data as unavailable.

## Consequences

This supports one trusted operator without provisioning an external identity
provider. Multi-operator roles, audit attribution and password recovery require
a future identity-provider integration. Distributed login throttling belongs
at production ingress; application throttling provides a bounded local layer.
The existing usage ledger cannot measure request error rates, latency, unique
people or model spending, so the dashboard does not claim those metrics.
