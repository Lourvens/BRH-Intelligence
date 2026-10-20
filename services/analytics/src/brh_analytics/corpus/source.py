"""Read the extracted corpus — what OCR has produced, document by document.

Three sources, never confused:

* ``data/ocr/<sha256>/meta.json`` is the extraction record the pipeline writes.
  It is the only place pages, characters, figures and seconds exist, and it is
  committed, so these stats are reproducible offline.
* ``experiments/gold/page-profiles.json`` profiles **every page** of the
  116-document sample: scanned, table, figure, columns, dpi. It is the only
  per-page ground truth we have, and it covers the sample — not the corpus. The
  findings that use it say so.
* ``corpus.crawl_urls`` is the catalogue, for coverage only. It is the same ops
  table the inventory family reads, not the retrieval store, so ADR-0006's
  ``RetrievalService`` rule does not apply. Nothing here reads Postgres or
  Pinecone *content*; when retrieval lands, corpus stats that need vectors must
  go through that service.

If Postgres is unreachable the disk findings still build and the coverage ones
are omitted, with a warning: a missing source should be visible, not silently
turned into a zero.
"""

from __future__ import annotations

import json
import statistics
import warnings
from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

from brh_core.config import Settings, get_settings

OCR_DIR = Path("data") / "ocr"
PROFILES = Path("experiments") / "gold" / "page-profiles.json"

_SQL = """
    SELECT date_part('year', wp_date)::int AS year, status, count(*) AS documents
    FROM corpus.crawl_urls
    GROUP BY 1, 2
"""


def repo_root(start: Path | None = None) -> Path:
    """The repository root, found by its committed corpus.

    Walks up from this module rather than trusting the working directory, so
    the CLI finds the corpus from any member of the workspace.
    """
    here = (start or Path(__file__)).resolve()
    for candidate in (here, *here.parents):
        if (candidate / OCR_DIR).is_dir():
            return candidate
    raise FileNotFoundError(f"no {OCR_DIR} above {here}")


@dataclass(frozen=True, slots=True)
class Extraction:
    """One document the pipeline finished, as ``meta.json`` records it."""

    sha256: str
    pages: int
    chars: int
    figures: int
    seconds: float
    gpu: str | None = None
    finished_at: str | None = None

    @property
    def seconds_per_page(self) -> float:
        return self.seconds / self.pages if self.pages else 0.0

    @property
    def chars_per_page(self) -> float:
        return self.chars / self.pages if self.pages else 0.0


@dataclass(frozen=True, slots=True)
class PageProfile:
    """One profiled page: the shape of the page, not its text."""

    sha256: str
    year: int | None
    chars: int
    scanned: bool
    table: bool
    figure: bool
    columns: bool
    dpi: float | None = None


@dataclass(frozen=True, slots=True)
class YearPages:
    """Page composition for one publication year, inside the sample."""

    pages: int
    scanned: int

    @property
    def scanned_share(self) -> float:
        return 100 * self.scanned / self.pages if self.pages else 0.0


@dataclass(frozen=True, slots=True)
class Sample:
    """The 116-document, per-page profile. A sample, never the corpus."""

    pages: tuple[PageProfile, ...]

    @property
    def total(self) -> int:
        return len(self.pages)

    @property
    def documents(self) -> int:
        return len({page.sha256 for page in self.pages})

    @property
    def scanned(self) -> int:
        return sum(1 for page in self.pages if page.scanned)

    @property
    def born_digital(self) -> int:
        return self.total - self.scanned

    @property
    def scanned_share(self) -> float:
        return 100 * self.scanned / self.total if self.total else 0.0

    @property
    def tables(self) -> int:
        return sum(1 for page in self.pages if page.table)

    @property
    def figures(self) -> int:
        return sum(1 for page in self.pages if page.figure)

    @property
    def columns(self) -> int:
        return sum(1 for page in self.pages if page.columns)

    def by_year(self) -> dict[int, YearPages]:
        """Pages per publication year, ascending, gap-free."""
        counted: dict[int, list[int]] = {}
        for page in self.pages:
            if page.year is None:
                continue
            bucket = counted.setdefault(page.year, [0, 0])
            bucket[0] += 1
            bucket[1] += int(page.scanned)
        if not counted:
            return {}
        return {
            year: YearPages(*counted.get(year, [0, 0]))
            for year in range(min(counted), max(counted) + 1)
        }

    def _scan_flags(self) -> dict[str, list[bool]]:
        flags: dict[str, list[bool]] = {}
        for page in self.pages:
            flags.setdefault(page.sha256, []).append(page.scanned)
        return flags

    @property
    def document_kinds(self) -> dict[str, int]:
        """Documents that are wholly digital, wholly scanned, or neither."""
        kinds = Counter(
            "digital" if not any(scanned) else "scanned" if all(scanned) else "hybrid"
            for scanned in self._scan_flags().values()
        )
        return {name: kinds.get(name, 0) for name in ("digital", "hybrid", "scanned")}

    @property
    def hybrid_scanned_pages(self) -> int:
        """Scanned pages hidden inside documents that also carry digital pages."""
        hybrid = {
            sha for sha, scanned in self._scan_flags().items() if any(scanned) and not all(scanned)
        }
        return sum(1 for page in self.pages if page.scanned and page.sha256 in hybrid)

    @property
    def wholly_scanned_pages(self) -> int:
        """Scanned pages inside documents where every page is scanned."""
        whole = {sha for sha, scanned in self._scan_flags().items() if all(scanned)}
        return sum(1 for page in self.pages if page.scanned and page.sha256 in whole)


@dataclass(frozen=True, slots=True)
class Catalogue:
    """The crawl ledger's own count, by year and download status."""

    years: dict[int, int]
    pending: dict[int, int]

    @property
    def total(self) -> int:
        return sum(self.years.values())

    @property
    def pending_total(self) -> int:
        return sum(self.pending.values())


@dataclass(frozen=True, slots=True)
class Corpus:
    """Everything the corpus family knows, and the shapes its copy needs."""

    extractions: tuple[Extraction, ...]
    sample: Sample
    catalogue: Catalogue | None = None

    # --- volume ---------------------------------------------------------
    @property
    def documents(self) -> int:
        return len(self.extractions)

    @property
    def pages(self) -> int:
        return sum(item.pages for item in self.extractions)

    @property
    def chars(self) -> int:
        return sum(item.chars for item in self.extractions)

    @property
    def figures(self) -> int:
        return sum(item.figures for item in self.extractions)

    @property
    def seconds(self) -> float:
        return sum(item.seconds for item in self.extractions)

    @property
    def seconds_per_page(self) -> float:
        return self.seconds / self.pages if self.pages else 0.0

    @property
    def chars_per_page(self) -> float:
        return self.chars / self.pages if self.pages else 0.0

    @property
    def median_pages(self) -> float:
        return statistics.median([item.pages for item in self.extractions] or [0])

    @property
    def median_seconds(self) -> float:
        return statistics.median([item.seconds for item in self.extractions] or [0])

    @property
    def median_seconds_per_page(self) -> float:
        return statistics.median([item.seconds_per_page for item in self.extractions] or [0])

    @property
    def median_chars_per_page(self) -> float:
        return statistics.median([item.chars_per_page for item in self.extractions] or [0])

    @property
    def page_counts(self) -> tuple[int, ...]:
        return tuple(item.pages for item in self.extractions)

    @property
    def slowest(self) -> Extraction | None:
        return max(self.extractions, key=lambda item: item.seconds, default=None)

    def slower_than(self, minutes: float) -> int:
        return sum(1 for item in self.extractions if item.seconds > minutes * 60)

    def pages_in_documents_of_at_least(self, pages: int) -> int:
        return sum(item.pages for item in self.extractions if item.pages >= pages)

    def gpu_mix(self) -> dict[str, tuple[int, int, float]]:
        """``gpu -> (documents, pages, median seconds per page)``."""
        grouped: dict[str, list[Extraction]] = {}
        for item in self.extractions:
            grouped.setdefault(item.gpu or "inconnu", []).append(item)
        return {
            name: (
                len(items),
                sum(item.pages for item in items),
                statistics.median([item.seconds_per_page for item in items]),
            )
            for name, items in sorted(grouped.items())
        }

    # --- coverage -------------------------------------------------------
    @property
    def coverage(self) -> float | None:
        if not self.catalogue or not self.catalogue.total:
            return None
        return 100 * self.documents / self.catalogue.total

    @property
    def remaining(self) -> int | None:
        if not self.catalogue:
            return None
        return max(0, self.catalogue.total - self.documents)


def quantile(values: Sequence[float], fraction: float) -> float:
    """Nearest-rank quantile — the value that many documents actually reach."""
    ordered = sorted(values)
    if not ordered:
        return 0.0
    index = round(fraction * (len(ordered) - 1))
    return ordered[max(0, min(index, len(ordered) - 1))]


def bucket(values: Sequence[float], bounds: Sequence[tuple[float, float]]) -> tuple[int, ...]:
    """Count values per ``[low, high)`` bound. Binning belongs to the caller."""
    return tuple(sum(1 for value in values if low <= value < high) for low, high in bounds)


def read_extractions(directory: Path) -> tuple[Extraction, ...]:
    """Every finished document under ``directory``, in sha order.

    A document counts only when ``document.md`` is non-empty: that is the same
    completeness rule the pipeline and the merge script use, so a half-copied
    directory can never inflate the stats.
    """
    if not directory.is_dir():
        raise FileNotFoundError(f"no extracted corpus at {directory}")

    extractions: list[Extraction] = []
    for folder in sorted(path for path in directory.iterdir() if path.is_dir()):
        document = folder / "document.md"
        meta = folder / "meta.json"
        if folder.name.startswith("_") or not document.is_file() or not meta.is_file():
            continue
        if document.stat().st_size == 0:
            continue
        payload = json.loads(meta.read_text(encoding="utf-8"))
        extractions.append(
            Extraction(
                sha256=payload.get("sha256", folder.name),
                pages=int(payload["pages"]),
                chars=int(payload["chars"]),
                figures=int(payload.get("figures", 0)),
                seconds=float(payload["seconds"]),
                gpu=payload.get("gpu"),
                finished_at=payload.get("finished_at"),
            )
        )
    return tuple(extractions)


def read_sample(path: Path) -> Sample:
    """The per-page profile. An absent file means ``Sample(())``, never a crash."""
    if not path.is_file():
        return Sample(())
    rows = json.loads(path.read_text(encoding="utf-8"))
    return Sample(
        tuple(
            PageProfile(
                sha256=row["sha"],
                year=row.get("year"),
                chars=int(row.get("chars", 0)),
                scanned=bool(row.get("scanned")),
                table=bool(row.get("table")),
                figure=bool(row.get("figure")),
                columns=bool(row.get("columns")),
                dpi=row.get("dpi"),
            )
            for row in rows
        )
    )


def load_catalogue(settings: Settings | None = None) -> Catalogue | None:
    """Read the catalogue's own per-year counts, or ``None`` if Postgres is down."""
    from brh_core.db.pool import open_pool

    pool = None
    try:
        pool = open_pool(settings or get_settings())
        pool.open()
        with pool.connection() as conn:
            rows = conn.execute(_SQL).fetchall()
    except Exception as error:  # a missing source must not hide the disk stats
        warnings.warn(
            f"catalogue unavailable ({error}); coverage findings skipped",
            RuntimeWarning,
            stacklevel=2,
        )
        return None
    finally:
        if pool is not None:
            pool.close()

    years: Counter[int] = Counter()
    pending: Counter[int] = Counter()
    for row in rows:
        year = row["year"]
        if year is None:
            continue
        years[year] += row["documents"]
        if row["status"] == "pending":
            pending[year] += row["documents"]
    return Catalogue(
        years={year: years[year] for year in sorted(years)},
        pending={year: pending.get(year, 0) for year in sorted(years)},
    )


def load(
    root: Path | None = None,
    *,
    with_catalogue: bool = True,
    settings: Settings | None = None,
) -> Corpus:
    """Read both sources. ``with_catalogue=False`` keeps a run fully offline."""
    base = Path(root) if root is not None else repo_root()
    return Corpus(
        extractions=read_extractions(base / OCR_DIR),
        sample=read_sample(base / PROFILES),
        catalogue=load_catalogue(settings) if with_catalogue else None,
    )
