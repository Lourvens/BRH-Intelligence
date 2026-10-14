# ADR-0010: Provider-agnostic LLM configuration

- **Status**: Accepted
- **Date**: 2026-10-14

## Context

We want to use strong hosted models, but not be stranded if pricing, access,
or quality changes — or if we route through a gateway (Azure, LiteLLM, a
university proxy). The answer quality must not depend on one vendor's SDK
being installed.

## Decision

Select the chat model with `BRH_LLM_PROVIDER` (`anthropic` | `openai`) and
`BRH_LLM_MODEL`, plus optional `*_BASE_URL` overrides for gateways. A single
factory (`brh_agent.llm.build_chat_model`) returns a LangChain `BaseChatModel`;
nodes never import a provider SDK directly.

`BRH_LLM_MAX_TOKENS` defaults to 2048: proxies that enable extended thinking
can otherwise burn a small budget on the thinking block and return no text.

## Consequences

Easier:

- Swap providers by env. Tests can inject a fake chat model.
- Gateway routing (the sibling project needed a proxy-safe SDK subclass) is a
  base-URL concern, not a code change.

Harder:

- We are limited to the common denominator of LangChain chat models. Fine: the
  graph uses plain message in / message out.
- Provider-specific features (e.g. prompt caching) need an explicit extension.

## Alternatives considered

- **Hard-code Anthropic.** Rejected: single point of dependency.
- **A router library (LiteLLM) inside the app.** Deferred: a base URL points
  at LiteLLM when wanted, without a runtime dependency.
