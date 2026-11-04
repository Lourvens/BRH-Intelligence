"""Feedback repository preserves atomic admission and private identity boundaries."""

from contextlib import contextmanager
from uuid import uuid4

import pytest
from brh_core.operations.feedback import FeedbackLimitError, FeedbackRepository
from brh_core.operations.models import FeedbackStatus, FeedbackSubmission, FeedbackUpdate


class FakeConnection:
    def __init__(self, usage=None):
        self.usage = usage or {"total": 0, "retry": None}
        self.statements = []
        self.in_transaction = False
        self.rolled_back = False
        self.item = {"id": uuid4(), "status": "new"}

    @contextmanager
    def transaction(self):
        self.in_transaction = True
        try:
            yield
        except Exception:
            self.rolled_back = True
            raise
        finally:
            self.in_transaction = False

    def execute(self, query, parameters=()):
        self.statements.append((query, parameters, self.in_transaction))
        return self

    def fetchone(self):
        query = self.statements[-1][0]
        if "extract(epoch" in query:
            return self.usage
        if "count(*)" in query:
            return {"total": 25}
        return self.item

    def fetchall(self):
        return [self.item]


class FakePool:
    def __init__(self, conn):
        self.conn = conn

    @contextmanager
    def connection(self):
        yield self.conn


def submission():
    return FeedbackSubmission(category="bug", message="Une erreur à examiner.", page_path="/")


def test_submission_serializes_admission_before_count_and_insert():
    conn = FakeConnection()
    result = FeedbackRepository(FakePool(conn)).submit(submission(), "private-hash")
    assert result == conn.item
    assert "pg_advisory_xact_lock" in conn.statements[0][0]
    assert "count(*)" in conn.statements[1][0]
    assert "INSERT INTO" in conn.statements[2][0]
    assert all(in_transaction for _, _, in_transaction in conn.statements)
    assert conn.statements[0][1] == ("private-hash",)
    returning = conn.statements[-1][0].split("RETURNING")[1]
    assert "identity" not in returning


def test_hourly_limit_rolls_back_without_inserting():
    conn = FakeConnection({"total": 5, "retry": 45.25})
    with pytest.raises(FeedbackLimitError) as error:
        FeedbackRepository(FakePool(conn), hourly_limit=5).submit(submission(), "private-hash")
    assert error.value.retry_after == 46
    assert conn.rolled_back
    assert not any("INSERT" in query for query, _, _ in conn.statements)


def test_custom_hourly_limit_is_enforced():
    conn = FakeConnection({"total": 1, "retry": 0})
    with pytest.raises(FeedbackLimitError) as error:
        FeedbackRepository(FakePool(conn), hourly_limit=1).submit(submission(), "private-hash")
    assert error.value.retry_after == 1


def test_paginated_reads_and_updates_never_select_identity():
    conn = FakeConnection()
    repository = FeedbackRepository(FakePool(conn))
    result = repository.list_feedback(FeedbackStatus.resolved, 2)
    assert result["total"] == 25
    assert result["page_size"] == 20
    assert conn.statements[-1][1] == (FeedbackStatus.resolved, 20, 20)
    assert "identity" not in conn.statements[-1][0]
    identifier = str(uuid4())
    repository.update(identifier, FeedbackUpdate(status="in_review", admin_note="Examen en cours"))
    assert conn.statements[-1][1] == (FeedbackStatus.in_review, "Examen en cours", identifier)
    assert "identity" not in conn.statements[-1][0]
