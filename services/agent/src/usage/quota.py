"""UTC-day admission and accounting for the assistant token quota."""

from __future__ import annotations

import logging
import math
from collections.abc import Mapping
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta

from brh_core.config import Settings, get_settings

from usage.store import PostgresUsageStore, UsageStore

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class QuotaDecision:
    allowed: bool
    limit: int
    used: int
    remaining: int
    retry_after: int


def utc_day(now: datetime) -> date:
    return now.astimezone(UTC).date()


def seconds_until_utc_midnight(now: datetime) -> int:
    moment = now.astimezone(UTC)
    reset = datetime.combine(
        utc_day(moment) + timedelta(days=1), time.min, tzinfo=UTC
    )
    return max(1, math.ceil((reset - moment).total_seconds()))


class DailyTokenQuota:
    def __init__(
        self,
        settings: Settings | None = None,
        store: UsageStore | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.limit = self.settings.agent_daily_token_limit
        self._store = store

    @property
    def enabled(self) -> bool:
        return self.limit > 0

    @property
    def store(self) -> UsageStore:
        if self._store is None:
            self._store = PostgresUsageStore()
        return self._store

    def check(self, identity: str, now: datetime | None = None) -> QuotaDecision:
        moment = now or datetime.now(UTC)
        retry_after = seconds_until_utc_midnight(moment)
        if not self.enabled:
            return QuotaDecision(True, 0, 0, 0, retry_after)
        used = self.store.used(identity, utc_day(moment))
        remaining = max(0, self.limit - used)
        return QuotaDecision(used < self.limit, self.limit, used, remaining, retry_after)

    def record(
        self,
        identity: str,
        turn_id: str,
        usage: Mapping[str, int],
        now: datetime | None = None,
    ) -> None:
        if not self.enabled:
            return
        input_tokens = max(0, int(usage.get("input_tokens") or 0))
        output_tokens = max(0, int(usage.get("output_tokens") or 0))
        if input_tokens + output_tokens <= 0:
            return
        try:
            self.store.add(
                identity,
                turn_id,
                utc_day(now or datetime.now(UTC)),
                input_tokens,
                output_tokens,
            )
        except Exception:
            # The answer is already produced; never turn accounting into an outage.
            logger.exception("Assistant token usage could not be recorded")


_quota: DailyTokenQuota | None = None


def daily_quota() -> DailyTokenQuota:
    global _quota
    if _quota is None:
        _quota = DailyTokenQuota()
    return _quota
