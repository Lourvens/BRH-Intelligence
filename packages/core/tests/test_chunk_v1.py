"""Chunking strategy v1 — structure-aware, offline and deterministic.

The tests are organised by the decision each one protects, not by function:

* prose is packed, not fragmented, and never crosses a top-level division;
* a table over the cap splits without losing its header, its envelope or a row,
  and the parts are linked rather than overlapped;
* a series is grouped chronologically; a page-cut table is stitched first;
* provisions keep a threshold with its consequence;
* ids are deterministic and every chunk respects the cap.

``count_tokens=len(text.split())`` is injected so the caps are readable in the
assertions; the production estimator is tested separately.
"""

from __future__ import annotations

import itertools

import pytest
from brh_core.ingestion.chunk import chunk_pages, chunker_id, estimate_tokens
from brh_core.ingestion.chunking import CHUNKING_VERSION, blocks_from_pages
from brh_core.ingestion.extract import ExtractedPage
from brh_core.models import ChunkType

DOC = "doc"


def page(number: int, text: str) -> ExtractedPage:
    return ExtractedPage(page_number=number, text=text)


def words(text: str) -> int:
    return len(text.split())


def rows(lines: list[str]) -> list[str]:
    return [line for line in lines if line.startswith("|")]


def table_of(markdown: str):
    blocks = blocks_from_pages([page(1, markdown)])
    return next(block.table for block in blocks if block.table is not None)


def gfm(header: list[str], data: list[list[str]]) -> str:
    lines = ["| " + " | ".join(header) + " |", "|" + "---|" * len(header)]
    lines += ["| " + " | ".join(row) + " |" for row in data]
    return "\n".join(lines)


# --- identity -------------------------------------------------------------


def test_chunker_id_encodes_the_version_and_the_cap():
    assert chunker_id() == "structure-v2:448:safe-estimate-v2"
    assert chunker_id(max_tokens=400) == "structure-v2:400:safe-estimate-v2"
    assert chunker_id(max_tokens=400, tokenizer_id="hf:test") == "structure-v2:400:hf:test"
    assert CHUNKING_VERSION == "v2"


def test_ids_are_deterministic():
    pages = [page(1, "# T\n\nUn paragraphe.")]
    first = chunk_pages(DOC, pages)
    second = chunk_pages(DOC, pages)
    assert [c.chunk_id for c in first] == [c.chunk_id for c in second]
    assert [c.text for c in first] == [c.text for c in second]


def test_blank_pages_produce_no_chunks():
    assert chunk_pages(DOC, [page(1, "   \n\n  ")]) == []


# --- prose ----------------------------------------------------------------


def test_prose_is_packed_under_its_heading():
    pages = [page(1, "# TITRE\n\n## Section A\n\nPremier paragraphe.\n\n## Section B\n\nSecond.")]
    chunks = chunk_pages(DOC, pages, max_tokens=200, count_tokens=words)

    assert len(chunks) == 1
    chunk = chunks[0]
    assert chunk.chunk_type is ChunkType.prose
    # the path is the one at the chunk's first piece, which is the document title
    assert chunk.section_path == ("TITRE",)
    assert chunk.metadata["section_paths"] == [
        ["TITRE"],
        ["TITRE", "Section A"],
        ["TITRE", "Section B"],
    ]
    assert "## Section A" in chunk.text and "## Section B" in chunk.text


def test_a_chunk_starting_in_a_subsection_records_the_deep_path():
    body = " ".join(["mot"] * 100)
    pages = [page(1, f"# T\n\n## A\n\n{body}\n\n## B\n\ntexte court.")]
    chunks = chunk_pages(DOC, pages, max_tokens=70, count_tokens=words)

    assert len(chunks) > 1
    assert chunks[-1].section_path == ("T", "B")


def test_a_top_level_heading_starts_a_new_chunk():
    pages = [page(1, "# Un\n\nTexte un.\n\n# Deux\n\nTexte deux.")]
    chunks = chunk_pages(DOC, pages, max_tokens=200, count_tokens=words)

    assert [c.section_path for c in chunks] == [("Un",), ("Deux",)]


def test_prose_over_the_cap_is_split_between_paragraphs():
    paragraph = " ".join(["mot"] * 40)
    pages = [page(1, "\n\n".join([f"# T\n\n{paragraph}" for _ in range(5)]))]
    chunks = chunk_pages(DOC, pages, max_tokens=60, count_tokens=words)

    assert len(chunks) > 1
    assert all(chunk.token_count <= 60 for chunk in chunks)
    assert all("mot" in chunk.text for chunk in chunks)


def test_a_section_across_pages_keeps_a_page_range():
    pages = [page(1, "# T\n\nDébut du paragraphe"), page(2, "suite et fin.")]
    chunks = chunk_pages(DOC, pages, max_tokens=200, count_tokens=words)

    assert len(chunks) == 1
    assert chunks[0].page_number == 1 and chunks[0].page_end == 2
    assert chunks[0].spans_pages


# --- tables ---------------------------------------------------------------


def test_a_small_table_is_one_chunk_with_its_caption():
    markdown = "Tableau 1 — Inflation en %\n\n" + gfm(["Année", "Valeur"], [["2019", "1,2"]])
    chunks = chunk_pages(DOC, [page(1, markdown)], max_tokens=200, count_tokens=words)

    assert len(chunks) == 1
    chunk = chunks[0]
    assert chunk.chunk_type is ChunkType.table
    assert chunk.metadata["part_count"] == 1
    assert chunk.metadata["header_repeated"] is True
    assert chunk.metadata["envelope"]["title"] == "Tableau 1 — Inflation en %"
    assert chunk.metadata["envelope"]["unit"] == "en %"
    assert "| Année | Valeur |" in chunk.text


def test_a_large_table_splits_and_repeats_its_header():
    data = [
        [f"Ligne {year:02d}", str(index), "1,2"]
        for year in range(10, 20)
        for index in range(3)
    ]
    markdown = gfm(["Ligne", "Mois", "Valeur"], data)
    chunks = chunk_pages(DOC, [page(1, markdown)], max_tokens=40, count_tokens=words)

    assert len(chunks) > 1
    for chunk in chunks:
        assert chunk.chunk_type is ChunkType.table
        assert "| Ligne | Mois | Valeur |" in chunk.text
        assert chunk.metadata["header_repeated"] is True
        assert chunk.token_count <= 40


def test_table_parts_reconstruct_the_original_rows():
    data = [[str(index), f"valeur {index}"] for index in range(24)]
    markdown = gfm(["Ligne", "Valeur"], data)
    table = table_of(markdown)
    chunks = chunk_pages(DOC, [page(1, markdown)], max_tokens=40, count_tokens=words)

    header_lines = table.header_markup.count("\n") + 1
    collected: list[str] = []
    for chunk in chunks:
        collected.extend(rows(chunk.text.splitlines())[header_lines:])

    assert collected == list(table.raw_rows[table.header_rows :])


def test_table_parts_do_not_overlap():
    data = [[str(index), f"valeur {index}"] for index in range(24)]
    chunks = chunk_pages(
        DOC, [page(1, gfm(["Ligne", "Valeur"], data))], max_tokens=40, count_tokens=words
    )
    seen: list[str] = []
    for chunk in chunks:
        seen.extend(rows(chunk.text.splitlines())[2:])
    assert len(seen) == len(set(seen))


def test_table_parts_are_linked_to_each_other():
    data = [[str(index), f"valeur {index}"] for index in range(24)]
    chunks = chunk_pages(
        DOC, [page(1, gfm(["Ligne", "Valeur"], data))], max_tokens=40, count_tokens=words
    )

    assert chunks[0].metadata["prev_chunk_id"] is None
    assert chunks[-1].metadata["next_chunk_id"] is None
    for previous, following in itertools.pairwise(chunks):
        assert previous.metadata["next_chunk_id"] == following.chunk_id
        assert following.metadata["prev_chunk_id"] == previous.chunk_id
    assert all(chunk.metadata["part_count"] == len(chunks) for chunk in chunks)
    assert {chunk.metadata["table_id"] for chunk in chunks} == {f"{DOC}:t1"}


def test_a_table_that_fits_is_never_fragmented():
    data = [["2019", "1"], ["2019", "2"], ["2020", "3"], ["2020", "4"]]
    chunks = chunk_pages(
        DOC, [page(1, gfm(["Année", "Valeur"], data))], max_tokens=500, count_tokens=words
    )

    assert len(chunks) == 1
    assert chunks[0].metadata["row_total"] == 4


def test_a_table_that_must_split_breaks_at_a_year_boundary():
    data = [["2019", "1"], ["2019", "2"], ["2020", "3"], ["2020", "4"]]
    chunks = chunk_pages(
        DOC, [page(1, gfm(["Année", "Valeur"], data))], max_tokens=35, count_tokens=words
    )

    assert len(chunks) > 1
    # budget alone would cut after row 3; the year change cuts after row 2
    assert [(c.metadata["row_start"], c.metadata["row_end"]) for c in chunks] == [(1, 2), (3, 4)]


def test_a_period_table_is_labelled_as_a_series():
    months = ("janv. 2020", "févr. 2020", "mars 2020", "avril 2020", "mai 2020")
    data = [[month, "1,2"] for month in months]
    chunks = chunk_pages(
        DOC, [page(1, gfm(["Période", "Valeur"], data))], max_tokens=500, count_tokens=words
    )

    assert chunks[0].chunk_type is ChunkType.series


def test_an_html_table_keeps_its_markup():
    markdown = (
        "<table><tr><th>Année</th><th>Valeur</th></tr>"
        "<tr><td>2019</td><td>1,2</td></tr>"
        "<tr><td>2020</td><td>1,3</td><td>note</td></tr></table>"
    )
    chunks = chunk_pages(DOC, [page(1, markdown)], max_tokens=500, count_tokens=words)

    assert len(chunks) == 1
    chunk = chunks[0]
    assert chunk.metadata["format"] == "html"
    assert chunk.metadata["ragged"] is True
    assert "<td>2019</td>" in chunk.text
    assert "<th>Année</th>" in chunk.text


def test_html_td_period_rows_become_headers_and_rows_get_semantic_labels():
    markdown = (
        "Tableau 4.12 — Prix moyens (en gourdes)\n\n"
        "<table><tr><td></td><td>1er trimestre 2024</td><td>2e trimestre 2024</td></tr>"
        "<tr><td></td><td>Janv. 24</td><td>Avril 24</td></tr>"
        "<tr><td>Gazoline</td><td>200.00</td><td>210.00</td></tr></table>"
    )
    table = table_of(markdown)
    chunks = chunk_pages(DOC, [page(1, markdown)], max_tokens=200, count_tokens=words)

    assert table.header_rows == 2
    assert "Ligne —" in chunks[0].text
    assert "Gazoline" in chunks[0].text
    assert "1er trimestre 2024 / Janv. 24" in chunks[0].text


def test_table_envelope_keeps_following_source_context():
    markdown = (
        "Tableau 1 — Taux\n\n"
        "<table><tr><th>Année</th><th>Valeur</th></tr>"
        "<tr><td>2024</td><td>3,2</td></tr></table>\n\n"
        "Source : BRH"
    )
    chunk = chunk_pages(DOC, [page(1, markdown)], max_tokens=200, count_tokens=words)[0]

    assert chunk.metadata["envelope"]["source"] == "BRH"
    assert "Source: BRH" in chunk.text


def test_the_unit_never_swallows_table_markup():
    # Regression: a greedy "unité …" capture once pulled `</td></tr>` into the
    # envelope, so the chunk title contained HTML.
    markdown = (
        "Tableau 4.13 (suite)\n\n"
        "<table><tr><td>Véhicules (en unités)</td></tr>"
        "<tr><td>1 234</td></tr></table>"
    )
    chunk = chunk_pages(DOC, [page(1, markdown)], max_tokens=500, count_tokens=words)[0]
    envelope = chunk.metadata["envelope"]

    assert envelope["title"] == "Tableau 4.13 (suite)"
    assert envelope["unit"] and "<" not in envelope["unit"] and ">" not in envelope["unit"]


def test_a_table_cut_by_a_page_marker_is_stitched_first():
    first = gfm(["Année", "Valeur"], [["2019", "1"], ["2019", "2"]])
    second = "| 2020 | 3 |\n| 2020 | 4 |"
    chunks = chunk_pages(
        DOC, [page(1, first), page(2, second)], max_tokens=500, count_tokens=words
    )

    assert len(chunks) == 1
    chunk = chunks[0]
    assert chunk.metadata["row_total"] == 4
    assert chunk.page_number == 1 and chunk.page_end == 2
    assert chunk.text.count("| Année | Valeur |") == 1


def test_adjacent_tables_with_different_headers_are_not_stitched():
    first = gfm(["Année", "Valeur"], [["2019", "1"]])
    second = gfm(["Mois", "Taux"], [["janvier", "2"]])
    chunks = chunk_pages(DOC, [page(1, first), page(2, second)], max_tokens=500, count_tokens=words)

    assert len(chunks) == 2
    assert chunks[0].metadata["table_id"] != chunks[1].metadata["table_id"]


def test_a_row_over_the_budget_is_fragmented_without_exceeding_the_cap():
    huge = "x" * 400
    data = [[str(index), huge] for index in range(2)]
    chunks = chunk_pages(
        DOC, [page(1, gfm(["Ligne", "Valeur"], data))], max_tokens=200, count_tokens=len
    )

    assert all(chunk.token_count <= 200 for chunk in chunks)
    assert all(chunk.metadata["row_fragment_count"] > 1 for chunk in chunks)
    assert "".join(chunk.text for chunk in chunks).count("x") == 800


# --- provisions -----------------------------------------------------------


def test_a_regulatory_document_keeps_a_condition_with_its_consequence():
    item = "a) La position de change ne doit pas dépasser le seuil de dix pour cent du capital."
    condition = item + "\n\nSi ce seuil est dépassé, la sanction est de cinquante mille gourdes."
    padding = "\n\n".join([" ".join(["remplissage"] * 60)] * 3)
    markdown = f"# CIRCULAIRE\n\n### 1. Dispositions\n\n{padding}\n\n{condition}"

    chunks = chunk_pages(DOC, [page(1, markdown)], max_tokens=120, count_tokens=words)
    preserving = [chunk for chunk in chunks if "dépassé" in chunk.text]

    assert preserving, "the condition and its consequence must be retrievable"
    assert all(chunk.chunk_type is ChunkType.provision for chunk in chunks)


def test_an_annual_report_with_lettered_notes_is_not_regulatory():
    markdown = (
        "# RAPPORT ANNUEL 2010\n\n"
        "a) Dépôts moyens de la période.\n\n"
        "b) Résultats de la période."
    )
    chunks = chunk_pages(DOC, [page(1, markdown)], max_tokens=120, count_tokens=words)

    assert all(chunk.chunk_type is ChunkType.prose for chunk in chunks)


# --- cap and estimator ----------------------------------------------------


def test_every_chunk_respects_the_cap_on_a_mixed_document():
    data = [[str(index), f"valeur {index}"] for index in range(30)]
    markdown = "\n\n".join(
        [
            "# RAPPORT",
            "## Section",
            " ".join(["texte"] * 120),
            "Tableau 2 — Série en %",
            gfm(["Ligne", "Valeur"], data),
            " ## Suite",
            " ".join(["suite"] * 80),
        ]
    )
    chunks = chunk_pages(DOC, [page(1, markdown)], max_tokens=80, count_tokens=words)

    assert chunks
    assert all(chunk.token_count <= 80 for chunk in chunks)


def test_estimate_tokens_is_conservative_for_tables():
    prose = "la banque a publié une note"
    assert estimate_tokens(prose) >= 1
    # digits and pipes cost more per character than prose
    table = "| a | b |\n| 1 | 2 |"
    assert estimate_tokens(table) > len(table) // 3.5


def test_default_estimator_keeps_ocr_text_below_the_safe_budget():
    text = "économie 2024 — " * 100
    chunks = chunk_pages(DOC, [page(1, text)])

    assert chunks
    assert all(chunk.token_count <= 448 for chunk in chunks)


def test_escaped_pipes_do_not_create_extra_table_columns():
    markdown = "| Libellé | Valeur |\n| --- | --- |\n| taux \\| net | 2,5 |"
    chunks = chunk_pages(DOC, [page(1, markdown)], max_tokens=200, count_tokens=words)

    assert chunks[0].metadata["ragged"] is False
    assert "taux \\| net" in chunks[0].text


def test_invalid_cap_is_rejected():
    with pytest.raises(ValueError):
        chunk_pages(DOC, [page(1, "texte")], max_tokens=0)
