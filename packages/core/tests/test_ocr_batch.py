"""Batch OCR: manifest, ledger, retries, and the assembly contract.

Everything here runs offline against a fake engine — the point is the batch
behaviour, not the model. `PaddleOcrVlEngine` is never imported.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest
from brh_core.ingestion.engines import OcrDocument, OcrPage
from brh_core.ingestion.markdown import PAGE_MARKER_RE, clean_page
from brh_core.ingestion.ocr import (
    DOCUMENT,
    LEDGER,
    TRACES,
    Ledger,
    ManifestItem,
    manifest_from_dir,
    read_manifest,
    run_batch,
    write_manifest,
)


class FakeEngine:
    """Two pages: a captioned figure, then a two-column table."""

    name = "fake"

    def __init__(self, *, pages: int = 2, fail_on: set[str] | None = None) -> None:
        self.pages = pages
        self.fail_on = fail_on or set()
        self.calls: list[str] = []

    def version(self) -> str:
        return "0.0-test"

    def parse(self, pdf: Path, workdir: Path) -> OcrDocument:
        self.calls.append(pdf.stem)
        if pdf.stem in self.fail_on:
            raise RuntimeError("boom")

        pages = []
        for number in range(1, self.pages + 1):
            directory = workdir / "pages" / f"p{number:03d}"
            (directory / "imgs").mkdir(parents=True, exist_ok=True)
            if number == 1:
                (directory / "imgs" / "fig1.jpg").write_bytes(b"jpeg")
                body = (
                    '<div style="text-align: center;">Figure 1 &amp; notes</div>\n\n'
                    '<img src="imgs/fig1.jpg" width="100%" />\n'
                )
            else:
                body = (
                    "<table border=1><tr><td>a</td><td>b</td></tr>"
                    "<tr><td>1</td><td>2</td></tr></table>\n"
                )
            pages.append(OcrPage(number=number, markdown=body, source_dir=directory))
        return OcrDocument(pages=pages, engine=self.name, engine_version=self.version())


def make_pdf(directory: Path, name: str = "doc") -> ManifestItem:
    directory.mkdir(parents=True, exist_ok=True)
    pdf = directory / f"{name}.pdf"
    pdf.write_bytes(b"%PDF-1.4 fake")
    return ManifestItem(sha256=hashlib.sha256(pdf.read_bytes()).hexdigest(), path=pdf)


def quiet(_: str) -> None:
    pass


# --- manifest ---------------------------------------------------------------


def test_manifest_roundtrip_dedupes_by_hash(tmp_path: Path) -> None:
    item = make_pdf(tmp_path / "in")
    path = tmp_path / "manifest.jsonl"
    write_manifest([item, item], path)

    loaded = read_manifest(path)
    assert [row.sha256 for row in loaded] == [item.sha256]
    assert loaded[0].path == item.path


def test_manifest_from_dir_rejects_a_file_that_lies_about_its_hash(tmp_path: Path) -> None:
    liar = tmp_path / f"{'0' * 64}.pdf"
    liar.write_bytes(b"%PDF-1.4 other bytes")

    with pytest.raises(ValueError, match="does not match its name"):
        manifest_from_dir(tmp_path)


def test_manifest_from_dir_hashes_plainly_named_files(tmp_path: Path) -> None:
    pdf = tmp_path / "circulaire.pdf"
    pdf.write_bytes(b"%PDF-1.4")

    items = manifest_from_dir(tmp_path)
    assert [row.sha256 for row in items] == [hashlib.sha256(b"%PDF-1.4").hexdigest()]


# --- run --------------------------------------------------------------------


def test_run_writes_document_assets_and_traces(tmp_path: Path) -> None:
    item = make_pdf(tmp_path / "in")
    out = tmp_path / "out"
    engine = FakeEngine()

    report = run_batch([item], out, engine, batch="b1", log=quiet)

    assert report.done == [item.sha256] and report.ok
    assert engine.calls == [item.path.stem]

    document = (out / item.sha256 / DOCUMENT).read_text()
    assert [int(n) for n in PAGE_MARKER_RE.findall(document)] == [1, 2]
    assert "Figure 1 & notes" in document  # <div> unwrapped, entity unescaped
    assert "![](assets/p001/fig1.jpg)" in document  # rewritten to a live path
    assert (out / item.sha256 / "assets" / "p001" / "fig1.jpg").is_file()
    assert "| a | b |" in document and "| --- | --- |" in document  # HTML → pipe table
    assert "<td" not in document

    traces = json.loads((out / item.sha256 / TRACES).read_text())
    assert traces["pages"] == 2
    assert traces["figures"] == 1
    assert traces["engine"] == "fake"
    assert traces["batch"] == "b1"
    assert traces["chars"] == len(document)


def test_rerunning_a_batch_skips_finished_documents(tmp_path: Path) -> None:
    item = make_pdf(tmp_path / "in")
    out = tmp_path / "out"
    engine = FakeEngine()

    run_batch([item], out, engine, batch="b1", log=quiet)
    second = run_batch([item], out, engine, batch="b2", log=quiet)

    assert second.skipped == [item.sha256]
    assert second.done == []
    assert len(engine.calls) == 1  # the model never ran twice


def test_a_failed_document_is_retried_only_on_request(tmp_path: Path) -> None:
    item = make_pdf(tmp_path / "in")
    out = tmp_path / "out"
    failing = FakeEngine(fail_on={item.path.stem})

    first = run_batch([item], out, failing, batch="b1", log=quiet)
    assert [sha for sha, _ in first.failed] == [item.sha256]
    assert not (out / item.sha256 / DOCUMENT).exists()  # no half-written document

    skipped = run_batch([item], out, FakeEngine(), batch="b2", log=quiet)
    assert skipped.skipped == [item.sha256]

    retried = run_batch([item], out, FakeEngine(), batch="b3", retry_failed=True, log=quiet)
    assert retried.done == [item.sha256]

    events = [json.loads(line) for line in (out / LEDGER).read_text().splitlines()]
    assert [e["event"] for e in events] == ["started", "failed", "started", "done"]
    assert [e["attempt"] for e in events] == [1, 1, 2, 2]
    assert [e["batch"] for e in events] == ["b1", "b1", "b3", "b3"]


def test_a_document_stops_after_max_attempts(tmp_path: Path) -> None:
    item = make_pdf(tmp_path / "in")
    out = tmp_path / "out"
    failing = FakeEngine(fail_on={item.path.stem})

    for _ in range(2):
        run_batch([item], out, failing, batch="b", retry_failed=True, max_attempts=2, log=quiet)

    report = run_batch([item], out, FakeEngine(), batch="b", retry_failed=True,
                       max_attempts=2, log=quiet)
    assert report.exhausted == [item.sha256]
    assert report.done == []


def test_limit_bounds_a_batch(tmp_path: Path) -> None:
    items = [make_pdf(tmp_path / "in", f"doc{i}") for i in range(3)]
    out = tmp_path / "out"

    report = run_batch(items, out, FakeEngine(), batch="b", limit=2, log=quiet)

    assert len(report.done) == 2
    assert Ledger(out / LEDGER).replay().keys() == set(report.done)


def test_a_missing_source_is_recorded_as_failed(tmp_path: Path) -> None:
    item = ManifestItem(sha256="a" * 64, path=tmp_path / "gone.pdf")
    out = tmp_path / "out"

    report = run_batch([item], out, FakeEngine(), batch="b", log=quiet)

    assert [sha for sha, _ in report.failed] == [item.sha256]
    assert "missing file" in json.loads((out / LEDGER).read_text().splitlines()[0])["error"]
    assert Ledger(out / LEDGER).replay()[item.sha256].attempts == 1


# --- cleaning ---------------------------------------------------------------


def test_ragged_tables_keep_their_structure_but_lose_styling() -> None:
    markup = (
        "<table border=1 style='margin:auto'>"
        "<tr><td style='x'>a</td><td>b</td><td>c</td></tr>"
        "<tr><td>1</td><td>2</td></tr></table>"
    )
    cleaned = clean_page(markup)

    assert "<td" in cleaned and "style=" not in cleaned and "border=" not in cleaned
