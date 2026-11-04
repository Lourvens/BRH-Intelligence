"""Read operational aggregates without exposing identities or internal errors."""

from datetime import UTC, datetime

from brh_core.operations.feedback import FeedbackRepository


class OperationsRepository(FeedbackRepository):
    def usage(self) -> dict:
        with self.pool.connection() as conn, conn.transaction():
            totals = conn.execute(
                """SELECT count(*) AS completed_turns,count(DISTINCT identity) active_identities,
                    coalesce(sum(input_tokens),0) input_tokens,
                    coalesce(sum(output_tokens),0) output_tokens,
                    coalesce(sum(input_tokens+output_tokens),0) total_tokens
                    FROM corpus.assistant_daily_usage
                    WHERE usage_date BETWEEN (now() AT TIME ZONE 'UTC')::date - 29
                        AND (now() AT TIME ZONE 'UTC')::date"""
            ).fetchone()
            daily = conn.execute(
                """SELECT day::date AS date,count(u.turn_id) AS completed_turns,
                    coalesce(sum(u.input_tokens+u.output_tokens),0) AS total_tokens
                    FROM generate_series((now() AT TIME ZONE 'UTC')::date - 29,
                        (now() AT TIME ZONE 'UTC')::date,interval '1 day') AS day
                    LEFT JOIN corpus.assistant_daily_usage u ON u.usage_date=day::date
                    GROUP BY day ORDER BY day"""
            ).fetchall()
        return {
            "days": 30,
            **{key: int(value) for key, value in totals.items()},
            "daily": [
                {
                    "date": row["date"],
                    "completed_turns": int(row["completed_turns"]),
                    "total_tokens": int(row["total_tokens"]),
                }
                for row in daily
            ],
        }

    def jobs(self) -> dict:
        with self.pool.connection() as conn:
            rows = conn.execute(
                "SELECT status,count(*) AS total FROM corpus.processing_jobs GROUP BY status"
            ).fetchall()
            recent = conn.execute(
                """SELECT j.job_id,d.title,j.stage,j.status,j.started_at,j.finished_at
                    FROM corpus.processing_jobs j JOIN corpus.documents d USING(document_id)
                    ORDER BY j.started_at DESC,j.job_id DESC LIMIT 10"""
            ).fetchall()
        counts = dict.fromkeys(("pending", "running", "succeeded", "failed"), 0)
        counts.update({row["status"]: row["total"] for row in rows})
        return {"counts": counts, "recent": [dict(row) for row in recent]}

    def overview(self) -> dict:
        return {
            "generated_at": datetime.now(UTC),
            "usage": self.usage(),
            "jobs": self.jobs(),
            "feedback": self.counts(),
        }
