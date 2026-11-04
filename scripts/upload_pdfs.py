"""Publish source PDFs at ``<slug>.pdf`` for citation deep links.

Run inside the deployed image after the OCR volume is mounted, or locally with
``BRH_PDF_ROOT=data/raw/web``.
"""

from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import boto3
from brh_core.config import get_settings
from brh_core.db.pool import open_pool


def main() -> None:
    settings = get_settings()
    root = Path(os.environ.get("BRH_PDF_ROOT", "data/raw/web"))
    pool = open_pool(settings)
    pool.open(wait=True)
    try:
        with pool.connection() as conn:
            rows = conn.execute(
                "SELECT sha256, slug FROM corpus.documents WHERE slug IS NOT NULL"
            ).fetchall()
    finally:
        pool.close()

    client = boto3.client(
        "s3",
        endpoint_url=settings.artifact_s3_endpoint,
        region_name=settings.artifact_s3_region,
        aws_access_key_id=settings.aws_access_key_id.get_secret_value(),
        aws_secret_access_key=settings.aws_secret_access_key.get_secret_value(),
    )
    tasks = [
        (row["sha256"], row["slug"])
        for row in rows
        if (root / f"{row['sha256']}.pdf").is_file()
    ]

    def upload(task: tuple[str, str]) -> str:
        sha, slug = task
        client.upload_file(
            str(root / f"{sha}.pdf"),
            settings.artifact_s3_bucket,
            f"{slug}.pdf",
            ExtraArgs={"ContentType": "application/pdf"},
        )
        return slug

    with ThreadPoolExecutor(max_workers=16) as executor:
        uploaded = list(executor.map(upload, tasks))
    print(f"uploaded {len(uploaded)} PDFs for {len(rows)} documents")


if __name__ == "__main__":
    main()
