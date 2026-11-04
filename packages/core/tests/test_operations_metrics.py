"""Operational reporting preserves UTC bounds, numeric JSON values and safe job fields."""

from contextlib import contextmanager
from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import uuid4

from brh_core.operations.metrics import OperationsRepository
from pydantic import TypeAdapter


class ReportingConnection:
    def __init__(self):
        self.statements = []

    @contextmanager
    def transaction(self):
        yield

    def execute(self, statement):
        self.statements.append(" ".join(statement.split()))
        return self

    def fetchone(self):
        return {
            "completed_turns": 2,
            "active_identities": 1,
            "input_tokens": Decimal(15),
            "output_tokens": Decimal(5),
            "total_tokens": Decimal(20),
        }

    def fetchall(self):
        query = self.statements[-1]
        if "generate_series" in query:
            return [
                {"date": date(2026, 1, 1), "completed_turns": 0, "total_tokens": Decimal(0)},
                {"date": date(2026, 1, 2), "completed_turns": 2, "total_tokens": Decimal(20)},
            ]
        if "GROUP BY status" in query:
            return [{"status": "succeeded", "total": 7}, {"status": "failed", "total": 1}]
        return [
            {
                "job_id": uuid4(),
                "title": "Rapport BRH",
                "stage": "index",
                "status": "succeeded",
                "started_at": datetime(2026, 1, 1, tzinfo=UTC),
                "finished_at": None,
            }
        ]


class ReportingPool:
    def __init__(self):
        self.conn = ReportingConnection()

    @contextmanager
    def connection(self):
        yield self.conn


def test_usage_aggregates_a_bounded_utc_window_and_zero_fills_daily_series():
    pool = ReportingPool()
    usage = OperationsRepository(pool).usage()
    aggregate, daily = pool.conn.statements
    assert "count(DISTINCT identity)" in aggregate
    assert "usage_date BETWEEN (now() AT TIME ZONE 'UTC')::date - 29" in aggregate
    assert "AND (now() AT TIME ZONE 'UTC')::date" in aggregate
    assert "generate_series((now() AT TIME ZONE 'UTC')::date - 29" in daily
    assert "interval '1 day'" in daily
    assert "LEFT JOIN corpus.assistant_daily_usage" in daily
    assert "count(u.turn_id)" in daily
    assert "GROUP BY day ORDER BY day" in daily
    assert usage["days"] == 30
    assert usage["total_tokens"] == 20
    encoded = TypeAdapter(object).dump_python(usage, mode="json")
    assert isinstance(encoded["input_tokens"], int)
    assert isinstance(encoded["total_tokens"], int)
    assert encoded["daily"][0] == {"date": "2026-01-01", "completed_turns": 0, "total_tokens": 0}


def test_job_counts_keep_zero_states_and_recent_rows_do_not_expose_errors():
    pool = ReportingPool()
    jobs = OperationsRepository(pool).jobs()
    counts, recent = pool.conn.statements
    assert "GROUP BY status" in counts
    assert "WHERE" not in counts  # The dashboard labels these as all-time counts.
    assert "ORDER BY j.started_at DESC,j.job_id DESC LIMIT 10" in recent
    assert "error" not in recent
    assert jobs["counts"] == {"pending": 0, "running": 0, "succeeded": 7, "failed": 1}
    encoded = TypeAdapter(object).dump_python(jobs, mode="json")
    assert encoded["recent"][0]["started_at"] == "2026-01-01T00:00:00Z"
    assert isinstance(encoded["recent"][0]["job_id"], str)
    assert encoded["recent"][0]["finished_at"] is None
