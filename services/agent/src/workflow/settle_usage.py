"""Final graph node: charge this turn's token usage exactly once."""

from __future__ import annotations

import logging
from typing import Any

from langgraph.config import get_config

from usage.quota import DailyTokenQuota, daily_quota
from usage.tokens import total_tokens

logger = logging.getLogger(__name__)


def auth_identity() -> str | None:
    """Read the identity populated by LangGraph custom authentication."""
    try:
        config = get_config()
    except RuntimeError:
        return None
    user = config.get("configurable", {}).get("langgraph_auth_user")
    identity = (
        user.get("identity")
        if isinstance(user, dict)
        else getattr(user, "identity", None)
    )
    return str(identity) if identity else None


def commit_daily_usage(
    state: dict[str, Any], quota: DailyTokenQuota | None = None
) -> dict[str, Any]:
    quota = quota or daily_quota()
    usage = state.get("usage") or {}
    identity = auth_identity()
    turn_id = state.get("turn_id")
    if not quota.enabled or not identity or not turn_id:
        return {}
    if total_tokens(usage) <= 0:
        return {}
    quota.record(identity, str(turn_id), usage)
    return {}
