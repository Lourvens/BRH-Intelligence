"""The corpus family, offline.

Fixtures on disk for the loader, hand-built dataclasses for the maths, and one
invariant check against the committed corpus. Nothing here needs Postgres: the
catalogue is injected, and ``with_catalogue=False`` is the documented offline
path.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from brh_analytics import charts, palette
from brh_analytics.corpus import findings, source
from brh_analytics.corpus.source import (
    Catalogue,
    Corpus,
    Extraction,
    PageProfile,
    Sample,
    bucket,
    quantile,
)
from brh_analytics.finding import Finding
from brh_analytics.formatting import fr_percent
from matplotlib import colors
from matplotlib.figure import Figure


def _write_document(
    root: Path,
    sha: str,
    *,
    pages: int = 4,
    chars: int = 8_000,
    figures: int = 1,
    seconds: float = 80.0,
    gpu: str | None = None,
    body: str = "# document\n",
) -> None:
    folder = root / sha
    folder.mkdir(parents=True)
    (folder / "meta.json").write_text(
        json.dumps(
            {
                "sha256": sha,
                "pages": pages,
                "chars": chars,
                "figures": figures,
                "seconds": seconds,
                "gpu": gpu,
                "finished_at": "2026-10-20T10:00:00+00:00",
            }
        ),
        encoding="utf-8",
    )
    (folder / "document.md").write_text(body, encoding="utf-8")


def _page(
    sha: str,
    year: int,
    *,
    chars: int = 0,
    scanned: bool = False,
    table: bool = False,
    figure: bool = False,
    columns: bool = False,
) -> PageProfile:
    return PageProfile(
        sha, year, chars, scanned=scanned, table=table, figure=figure, columns=columns
    )


def _corpus() -> Corpus:
    extractions = (
        Extraction("a" * 64, pages=1, chars=1_000, figures=0, seconds=10.0, gpu="L4"),
        Extraction("b" * 64, pages=2, chars=5_000, figures=1, seconds=40.0, gpu="L4"),
        Extraction("c" * 64, pages=40, chars=200_000, figures=3, seconds=1_800.0, gpu="A100-80GB"),
    )
    sample = Sample(
        (
            _page("a" * 64, 2022, chars=900, scanned=True),
            _page("b" * 64, 2022, chars=2_000, table=True),
            _page("b" * 64, 2022, chars=2_100, figure=True, columns=True),
            _page("c" * 64, 2023, chars=3_000, table=True),
        )
    )
    catalogue = Catalogue(years={2022: 10, 2023: 20}, pending={2022: 6, 2023: 15})
    return Corpus(extractions=extractions, sample=sample, catalogue=catalogue)


# --- the loader -------------------------------------------------------------


def test_read_extractions_skips_incomplete_documents(tmp_path: Path) -> None:
    _write_document(tmp_path, "a" * 64)
    _write_document(tmp_path, "b" * 64, body="")  # half-copied: no text
    (tmp_path / ("c" * 64)).mkdir()
    (tmp_path / ("c" * 64) / "document.md").write_text("orphan")  # no meta.json
    (tmp_path / "_ledger").mkdir()
    (tmp_path / "_ledger" / "state.jsonl").write_text("{}\n")

    extracted = source.read_extractions(tmp_path)

    assert [item.sha256 for item in extracted] == ["a" * 64]


def test_read_extractions_refuses_a_missing_corpus(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError):
        source.read_extractions(tmp_path / "absent")


def test_read_sample_returns_an_empty_sample_when_absent(tmp_path: Path) -> None:
    assert source.read_sample(tmp_path / "page-profiles.json").pages == ()


def test_an_unreachable_catalogue_warns_and_returns_none(monkeypatch) -> None:
    import brh_core.db.pool as pool

    def refuse(settings):
        raise RuntimeError("postgres is down")

    monkeypatch.setattr(pool, "open_pool", refuse)
    with pytest.warns(RuntimeWarning, match="catalogue unavailable"):
        assert source.load_catalogue() is None


def test_load_offline_reads_the_disk_and_skips_the_catalogue(tmp_path: Path) -> None:
    (tmp_path / "data" / "ocr").mkdir(parents=True)
    _write_document(tmp_path / "data" / "ocr", "a" * 64, pages=3)

    corpus = source.load(tmp_path, with_catalogue=False)

    assert corpus.documents == 1
    assert corpus.pages == 3
    assert corpus.catalogue is None
    assert corpus.coverage is None


# --- the maths --------------------------------------------------------------


def test_volume_is_the_sum_of_its_documents() -> None:
    corpus = _corpus()

    assert corpus.documents == 3
    assert corpus.pages == 43
    assert corpus.chars == 206_000
    assert corpus.figures == 4
    assert corpus.seconds == pytest.approx(1_850)
    assert corpus.seconds_per_page == pytest.approx(1_850 / 43)
    assert corpus.median_pages == 2
    assert corpus.slowest is not None and corpus.slowest.pages == 40


def test_coverage_and_remaining_follow_the_catalogue() -> None:
    corpus = _corpus()

    assert corpus.catalogue is not None
    assert corpus.coverage == pytest.approx(100 * 3 / 30)
    assert corpus.remaining == 27


def test_sample_shares_are_measured_on_pages_not_documents() -> None:
    sample = _corpus().sample

    assert sample.total == 4
    assert sample.documents == 3
    assert sample.scanned == 1
    assert sample.scanned_share == pytest.approx(25.0)
    assert sample.tables == 2
    assert sample.figures == 1
    assert sample.columns == 1


def test_document_kinds_and_hidden_scanned_pages() -> None:
    sample = _corpus().sample

    # "a" is wholly scanned, "b" is digital on both pages, "c" is digital.
    assert sample.document_kinds == {"digital": 2, "hybrid": 0, "scanned": 1}
    assert sample.hybrid_scanned_pages == 0
    assert sample.wholly_scanned_pages == 1


def test_hybrid_counts_scanned_pages_inside_mixed_documents() -> None:
    sample = Sample(
        (
            PageProfile("a" * 64, 2022, 0, scanned=True, table=False, figure=False, columns=False),
            PageProfile("a" * 64, 2022, 0, scanned=False, table=False, figure=False, columns=False),
            PageProfile("b" * 64, 2022, 0, scanned=True, table=False, figure=False, columns=False),
        )
    )

    assert sample.document_kinds == {"digital": 0, "hybrid": 1, "scanned": 1}
    assert sample.hybrid_scanned_pages == 1
    assert sample.wholly_scanned_pages == 1
    assert sample.hybrid_scanned_pages + sample.wholly_scanned_pages == sample.scanned


def test_scan_share_by_year_is_gap_free() -> None:
    yearly = _corpus().sample.by_year()

    assert list(yearly) == [2022, 2023]
    assert yearly[2022].pages == 3
    assert yearly[2022].scanned_share == pytest.approx(100 / 3)
    assert yearly[2023].scanned_share == 0


def test_bucket_counts_half_open_ranges_and_quantile_is_nearest_rank() -> None:
    assert bucket([0, 1, 5, 9, 10], ((0, 5), (5, 10), (10, 100))) == (2, 2, 1)
    assert quantile([1, 2, 3, 4, 5], 0.5) == 3
    assert quantile([], 0.5) == 0.0


# --- the copy ---------------------------------------------------------------


def _by_slug(corpus: Corpus) -> dict[str, Finding]:
    return {finding.slug: finding for finding in findings.build(corpus)}


def test_build_produces_one_finding_per_idea() -> None:
    slugs = [finding.slug for finding in findings.build(_corpus())]

    assert slugs == [
        "couverture",
        "reste",
        "volume",
        "rythme",
        "queue",
        "pages",
        "hybride",
        "tableaux",
    ]


def test_an_empty_corpus_builds_nothing_rather_than_dividing_by_zero() -> None:
    empty = Corpus(extractions=(), sample=Sample(()), catalogue=None)

    assert findings.build(empty) == ()


def test_findings_without_a_catalogue_drop_only_the_coverage_posts() -> None:
    corpus = _corpus()
    offline = Corpus(extractions=corpus.extractions, sample=corpus.sample, catalogue=None)

    slugs = [finding.slug for finding in findings.build(offline)]

    assert "couverture" not in slugs
    assert "reste" not in slugs
    assert slugs[0] == "volume"


def test_findings_without_a_sample_drop_only_the_page_posts() -> None:
    corpus = _corpus()
    no_sample = Corpus(
        extractions=corpus.extractions, sample=Sample(()), catalogue=corpus.catalogue
    )

    slugs = [finding.slug for finding in findings.build(no_sample)]

    assert slugs == ["couverture", "reste", "volume", "rythme", "queue"]


def test_every_figure_is_derived_from_the_data() -> None:
    """Change the data, and every number in the copy that depends on it moves."""
    small = _by_slug(_corpus())
    larger = _by_slug(
        Corpus(
            extractions=(
                *_corpus().extractions,
                Extraction("d" * 64, pages=10, chars=30_000, figures=2, seconds=300.0),
            ),
            sample=_corpus().sample,
            catalogue=Catalogue(years={2022: 10, 2023: 20}, pending={2022: 6, 2023: 15}),
        )
    )

    assert small["volume"].headline != larger["volume"].headline
    assert small["volume"].caption != larger["volume"].caption
    assert small["rythme"].caption != larger["rythme"].caption
    assert small["couverture"].headline != larger["couverture"].headline


def test_coverage_figure_is_the_measured_share() -> None:
    finding = _by_slug(_corpus())["couverture"]

    assert finding.figure == fr_percent(100 * 3 / 30)


def test_every_finding_draws_a_chart_without_a_domain_type() -> None:
    for finding in findings.build(_corpus()):
        figure = finding.draw(400, 200)
        assert isinstance(figure, Figure)
        assert figure.axes, finding.slug


def test_histogram_labels_every_bin_and_uses_the_series_colour() -> None:
    figure = charts.histogram([("1", 2), ("2-4", 5), ("5+", 9)], width=400, height=200)
    axes = figure.axes[0]

    assert [text.get_text() for text in axes.texts] == ["2", "5", "9"]
    assert len(axes.patches) == 3
    assert {colors.to_hex(patch.get_facecolor()) for patch in axes.patches} == {
        palette.NAVY.lower()
    }


def test_per_year_can_label_a_share_in_percent() -> None:
    figure = charts.per_year({2022: 62.5, 2023: 0.0}, formatter=fr_percent, width=400, height=200)

    assert [text.get_text() for text in figure.axes[0].texts] == [
        fr_percent(62.5),
        fr_percent(0.0),
    ]


def test_the_committed_corpus_loads_without_a_catalogue() -> None:
    corpus = source.load(with_catalogue=False)

    assert corpus.documents > 0
    assert corpus.pages == sum(item.pages for item in corpus.extractions)
    assert len(corpus.page_counts) == corpus.documents
