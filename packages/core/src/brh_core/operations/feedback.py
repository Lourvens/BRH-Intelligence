"""Transactional feedback persistence with an identity-scoped hourly limit."""

import math

from brh_core.operations.models import FeedbackStatus, FeedbackSubmission, FeedbackUpdate

_COLUMNS = """id, category, message, page_path, thread_id, answer_excerpt,
    status, admin_note, created_at, updated_at"""
PAGE_SIZE = 20


class FeedbackLimitError(Exception):
    def __init__(self, retry_after: int):
        self.retry_after = retry_after
        super().__init__("Feedback hourly limit reached")


class FeedbackRepository:
    def __init__(self, pool, hourly_limit: int = 5):
        self.pool = pool
        self.hourly_limit = hourly_limit

    def submit(self, submission: FeedbackSubmission, identity: str) -> dict:
        with self.pool.connection() as conn, conn.transaction():
            # All writers for one identity serialize across processes/containers.
            conn.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))", (identity,))
            usage = conn.execute(
                """SELECT count(*) AS total,
                    extract(epoch FROM min(created_at) + interval '1 hour' - now()) AS retry
                    FROM corpus.user_feedback
                    WHERE identity=%s AND created_at > now() - interval '1 hour'""",
                (identity,),
            ).fetchone()
            if usage["total"] >= self.hourly_limit:
                raise FeedbackLimitError(max(1, math.ceil(usage["retry"] or 1)))
            row = conn.execute(
                f"""INSERT INTO corpus.user_feedback
                    (category,message,page_path,thread_id,answer_excerpt,identity)
                    VALUES (%s,%s,%s,%s,%s,%s) RETURNING {_COLUMNS}""",
                (
                    submission.category,
                    submission.message,
                    submission.page_path,
                    submission.thread_id,
                    submission.answer_excerpt,
                    identity,
                ),
            ).fetchone()
        return dict(row)

    def list_feedback(self, status: FeedbackStatus | None, page: int) -> dict:
        where = "WHERE status=%s" if status else ""
        parameters = (status,) if status else ()
        with self.pool.connection() as conn, conn.transaction():
            total = conn.execute(
                f"SELECT count(*) AS total FROM corpus.user_feedback {where}", parameters
            ).fetchone()["total"]
            rows = conn.execute(
                f"""SELECT {_COLUMNS} FROM corpus.user_feedback {where}
                    ORDER BY created_at DESC,id DESC LIMIT %s OFFSET %s""",
                (*parameters, PAGE_SIZE, (page - 1) * PAGE_SIZE),
            ).fetchall()
        return {
            "items": [dict(row) for row in rows],
            "total": total,
            "page": page,
            "page_size": PAGE_SIZE,
        }

    def update(self, identifier: str, update: FeedbackUpdate) -> dict | None:
        with self.pool.connection() as conn:
            row = conn.execute(
                f"""UPDATE corpus.user_feedback SET status=%s,admin_note=%s,updated_at=now()
                    WHERE id=%s RETURNING {_COLUMNS}""",
                (update.status, update.admin_note, identifier),
            ).fetchone()
        return dict(row) if row else None

    def counts(self) -> dict:
        with self.pool.connection() as conn:
            rows = conn.execute(
                "SELECT status,count(*) AS total FROM corpus.user_feedback GROUP BY status"
            ).fetchall()
        counts = {status.value: 0 for status in FeedbackStatus}
        counts.update({row["status"]: row["total"] for row in rows})
        return {**counts, "total": sum(counts.values())}
