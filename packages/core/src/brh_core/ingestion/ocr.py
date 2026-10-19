"""Batch OCR: a manifest in, a traceable ledger and per-document output out.

The run is **resumable and retryable by construction** rather than by memory:

* ``manifest.jsonl`` lists what should exist — one row per document, keyed by
  ``sha256``, so a re-download that changes bytes is a different document;
* ``<out>/state.jsonl`` is append-only, one event per line (``started``,
  ``done``, ``failed``), every event carrying the batch id and the attempt
  number. Status is replayed from it, never stored separately;
* a document is skipped when its last event is ``done`` and its file is still
  there, so re-running a batch is cheap and safe;
* ``--retry-failed`` re-queues documents whose last attempt failed, up to
  ``--max-attempts``; past that they are reported as exhausted, not retried
  forever.

Output is one directory per document::

    <out>/<sha256>/document.md     pages separated by <!-- page N -->
    <out>/<sha256>/assets/pNNN/    figure crops referenced by the markdown
    <out>/<sha256>/meta.json       engine, version, counts, seconds, batch

Usage::

    python -m brh_core.ingestion.ocr manifest --from-dir data/raw/web --out manifest.jsonl
    python -m brh_core.ingestion.ocr run --manifest manifest.jsonl --out data/ocr
    python -m brh_core.ingestion.ocr run --manifest manifest.jsonl --out data/ocr --retry-failed
    python -m brh_core.ingestion.ocr status --out data/ocr

Nothing here needs a GPU, Postgres or Colab; ``--device`` is passed through to
the engine, which decides what to do with it.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
import time
import traceback
from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

from brh_core.ingestion.engines import Engine, OcrDocument, PaddleOcrVlEngine
from brh_core.ingestion.markdown import IMG, PAGE_MARKER, clean_page

LEDGER = "state.jsonl"
DOCUMENT = "document.md"
TRACES = "meta.json"


def now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


# --- manifest ---------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class ManifestItem:
    sha256: str
    path: Path
    pages: int | None = None
    title: str = ""

    def to_json(self) -> dict:
        row: dict = {"sha256": self.sha256, "path": str(self.path)}
        if self.pages is not None:
            row["pages"] = self.pages
        if self.title:
            row["title"] = self.title
        return row


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def manifest_from_dir(directory: Path) -> list[ManifestItem]:
    """Hash every PDF in a directory.

    Files named after their own hash are verified rather than re-derived — the
    corpus stores PDFs as ``<sha256>.pdf``, and a mismatch means the file is not
    the document it claims to be, which must fail loudly.
    """
    items: list[ManifestItem] = []
    for pdf in sorted(directory.glob("*.pdf")):
        digest = sha256_of(pdf)
        if pdf.stem != digest and len(pdf.stem) == 64:
            raise ValueError(f"{pdf.name}: content hash {digest} does not match its name")
        items.append(ManifestItem(sha256=digest, path=pdf))
    return items


def write_manifest(items: Iterable[ManifestItem], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for item in items:
            handle.write(json.dumps(item.to_json(), ensure_ascii=False) + "\n")


def read_manifest(path: Path) -> list[ManifestItem]:
    items: list[ManifestItem] = []
    seen: set[str] = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        sha = row["sha256"]
        if sha in seen:
            continue  # one row per document: a duplicate would be OCR'd twice
        seen.add(sha)
        items.append(
            ManifestItem(
                sha256=sha,
                path=Path(row["path"]),
                pages=row.get("pages"),
                title=row.get("title", ""),
            )
        )
    return items


# --- ledger -----------------------------------------------------------------


@dataclass(slots=True)
class DocState:
    status: str = "pending"  # pending | running | done | failed
    attempts: int = 0
    error: str | None = None
    finished_at: str | None = None


class Ledger:
    """Append-only event log; state is a replay, never a separate write."""

    def __init__(self, path: Path) -> None:
        self.path = path

    def replay(self) -> dict[str, DocState]:
        states: dict[str, DocState] = {}
        if not self.path.is_file():
            return states
        for line in self.path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            event = json.loads(line)
            state = states.setdefault(event["sha256"], DocState())
            kind = event["event"]
            if "attempt" in event:  # any event counts toward the attempt budget
                state.attempts = event["attempt"]
            if kind == "started":
                state.status = "running"
            elif kind == "done":
                state.status = "done"
                state.error = None
                state.finished_at = event.get("ts")
            elif kind == "failed":
                state.status = "failed"
                state.error = event.get("error")
                state.finished_at = event.get("ts")
        return states

    def record(self, sha256: str, event: str, *, batch: str, **fields) -> None:
        row = {"ts": now(), "batch": batch, "sha256": sha256, "event": event, **fields}
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


# --- assembly ---------------------------------------------------------------


def assemble(document: OcrDocument, doc_dir: Path) -> tuple[str, int]:
    """Join pages into one markdown file, copying figures beside it."""
    parts: list[str] = []
    figures = 0
    for page in document.pages:
        assets = doc_dir / "assets" / f"p{page.number:03d}"
        copied = 0

        def localise(match, assets=assets, page=page):
            nonlocal copied
            source = page.source_dir / match.group(1)
            if not source.is_file():
                return "![](image)"  # the engine referenced a crop it did not write
            assets.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, assets / source.name)
            copied += 1
            return f"![](assets/p{page.number:03d}/{source.name})"

        text = IMG.sub(localise, page.markdown)
        figures += copied
        body = clean_page(text)
        parts.append(PAGE_MARKER.format(number=page.number) + "\n\n" + body)

    return "\n\n".join(parts).strip() + "\n", figures


# --- batch ------------------------------------------------------------------


@dataclass(slots=True)
class BatchReport:
    batch: str
    done: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)
    exhausted: list[str] = field(default_factory=list)
    failed: list[tuple[str, str]] = field(default_factory=list)
    seconds: float = 0.0

    @property
    def ok(self) -> bool:
        return not self.failed and not self.exhausted


def run_batch(
    items: Iterable[ManifestItem],
    out_dir: Path,
    engine: Engine,
    *,
    batch: str | None = None,
    retry_failed: bool = False,
    force: bool = False,
    max_attempts: int = 3,
    limit: int | None = None,
    log: Callable[[str], None] = print,
) -> BatchReport:
    """OCR every manifest item that still needs it."""
    batch = batch or datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    out_dir.mkdir(parents=True, exist_ok=True)
    ledger = Ledger(out_dir / LEDGER)
    states = ledger.replay()
    report = BatchReport(batch=batch)
    started = time.monotonic()
    processed = 0

    for item in items:
        if limit is not None and processed >= limit:
            break

        state = states.get(item.sha256, DocState())
        doc_dir = out_dir / item.sha256
        document = doc_dir / DOCUMENT

        if state.status == "done" and document.is_file() and not force:
            report.skipped.append(item.sha256)
            continue
        if state.status == "failed" and not retry_failed and not force:
            report.skipped.append(item.sha256)
            continue
        if state.status == "failed" and state.attempts >= max_attempts and not force:
            report.exhausted.append(item.sha256)
            log(f"{item.sha256[:8]}  exhausted after {state.attempts} attempt(s)")
            continue
        if not item.path.is_file():
            report.failed.append((item.sha256, f"missing file: {item.path}"))
            ledger.record(item.sha256, "failed", batch=batch,
                          attempt=state.attempts + 1, error=f"missing file: {item.path}")
            log(f"{item.sha256[:8]}  missing {item.path}")
            continue

        attempt = state.attempts + 1
        processed += 1
        ledger.record(item.sha256, "started", batch=batch, attempt=attempt,
                      engine=engine.name, engine_version=engine.version())
        doc_started = time.monotonic()
        workdir = doc_dir / ".work"
        try:
            parsed = engine.parse(item.path, workdir)
            markdown, figures = assemble(parsed, doc_dir)
            doc_dir.mkdir(parents=True, exist_ok=True)
            staged = doc_dir / (DOCUMENT + ".tmp")
            staged.write_text(markdown, encoding="utf-8")
            staged.replace(document)  # a half-written document is never visible

            elapsed = round(time.monotonic() - doc_started, 1)
            (doc_dir / TRACES).write_text(
                json.dumps(
                    {
                        "sha256": item.sha256,
                        "batch": batch,
                        "engine": parsed.engine,
                        "engine_version": parsed.engine_version,
                        "source": str(item.path),
                        "pages": len(parsed.pages),
                        "chars": len(markdown),
                        "figures": figures,
                        "seconds": elapsed,
                        "finished_at": now(),
                    },
                    indent=1,
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )
            ledger.record(item.sha256, "done", batch=batch, attempt=attempt,
                          pages=len(parsed.pages), chars=len(markdown),
                          figures=figures, seconds=elapsed)
            report.done.append(item.sha256)
            log(f"{item.sha256[:8]}  ok  {len(parsed.pages):>3} pages  "
                f"{len(markdown):>7,} chars  {figures:>2} fig  {elapsed:>6.1f}s")
        except Exception as exc:  # one document must not end the batch
            error = f"{type(exc).__name__}: {exc}"
            ledger.record(item.sha256, "failed", batch=batch, attempt=attempt,
                          error=error, traceback=traceback.format_exc(limit=5))
            report.failed.append((item.sha256, error))
            log(f"{item.sha256[:8]}  FAILED  {error}")
        finally:
            shutil.rmtree(workdir, ignore_errors=True)

    report.seconds = round(time.monotonic() - started, 1)
    return report


# --- cli --------------------------------------------------------------------


def _engine(args: argparse.Namespace) -> Engine:
    if args.engine == "paddleocr-vl":
        return PaddleOcrVlEngine(device=args.device, chart_recognition=not args.no_charts)
    raise SystemExit(f"unknown engine: {args.engine}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="brh_core.ingestion.ocr", description="Batch OCR.")
    sub = parser.add_subparsers(dest="command", required=True)

    manifest_cmd = sub.add_parser("manifest", help="Hash a directory of PDFs into a manifest.")
    manifest_cmd.add_argument("--from-dir", type=Path, required=True)
    manifest_cmd.add_argument("--out", type=Path, required=True)

    run_cmd = sub.add_parser("run", help="OCR everything the manifest lists and the ledger allows.")
    run_cmd.add_argument("--manifest", type=Path, required=True)
    run_cmd.add_argument("--out", type=Path, required=True)
    run_cmd.add_argument("--engine", default="paddleocr-vl")
    run_cmd.add_argument("--device", default=None, help="Passed to the engine, e.g. gpu:0 or cpu.")
    run_cmd.add_argument("--no-charts", action="store_true", help="Disable chart recognition.")
    run_cmd.add_argument("--batch", default=None, help="Batch id; defaults to a UTC timestamp.")
    run_cmd.add_argument("--retry-failed", action="store_true")
    run_cmd.add_argument("--force", action="store_true", help="Re-OCR even completed documents.")
    run_cmd.add_argument("--max-attempts", type=int, default=3)
    run_cmd.add_argument("--limit", type=int, default=None)

    status_cmd = sub.add_parser("status", help="Replay the ledger and print counts.")
    status_cmd.add_argument("--out", type=Path, required=True)

    args = parser.parse_args(argv)

    if args.command == "manifest":
        items = manifest_from_dir(args.from_dir)
        write_manifest(items, args.out)
        print(f"{len(items)} document(s) → {args.out}")
        return 0

    if args.command == "status":
        states = Ledger(args.out / LEDGER).replay()
        counts: dict[str, int] = {}
        for state in states.values():
            counts[state.status] = counts.get(state.status, 0) + 1
        print(f"{len(states)} document(s) in {args.out / LEDGER}")
        for status, count in sorted(counts.items()):
            print(f"  {status:<8} {count}")
        for sha, state in sorted(states.items()):
            if state.status == "failed":
                print(f"  {sha[:8]}  {state.attempts} attempt(s)  {state.error}")
        return 0

    report = run_batch(
        read_manifest(args.manifest),
        args.out,
        _engine(args),
        batch=args.batch,
        retry_failed=args.retry_failed,
        force=args.force,
        max_attempts=args.max_attempts,
        limit=args.limit,
    )
    print()
    print(f"batch {report.batch}: {len(report.done)} done, {len(report.skipped)} skipped, "
          f"{len(report.failed)} failed, {len(report.exhausted)} exhausted  "
          f"({report.seconds:.1f}s)")
    return 0 if report.ok else 1


if __name__ == "__main__":
    sys.exit(main())
