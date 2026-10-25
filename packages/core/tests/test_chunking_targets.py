"""Offline contracts for soft prose targets and hard structural ceilings."""

from __future__ import annotations

import pytest
from brh_core.ingestion.chunk import StructureChunker, chunk_pages, chunker_id
from brh_core.ingestion.chunking import blocks_from_pages
from brh_core.ingestion.extract import ExtractedPage
from brh_core.models import ChunkType


def words(text: str) -> int:
    return len(text.split())


def paragraph(label: str, size: int) -> str:
    return " ".join([label] * size)


def page(text: str, number: int = 1) -> ExtractedPage:
    return ExtractedPage(page_number=number, text=text)


def test_target_packs_paragraphs_while_max_remains_the_structural_ceiling():
    paragraphs = [paragraph(label, 384) for label in ("premier", "deuxième", "troisième")]
    pages = [page("\n\n".join(paragraphs))]
    legacy = chunk_pages("doc", pages, max_tokens=1536, count_tokens=words)
    targeted = chunk_pages("doc", pages, target_tokens=768, max_tokens=1536, count_tokens=words)

    assert [chunk.token_count for chunk in legacy] == [1152]
    assert [chunk.token_count for chunk in targeted] == [768, 384]
    assert "\n\n".join(chunk.text for chunk in targeted) == pages[0].text


def test_coherent_paragraph_between_target_and_max_stays_whole():
    body = paragraph("économie", 1000)
    pages = [page(f"# Rapport\n\n{body}\n\nConclusion brève.")]
    chunks = chunk_pages("doc", pages, target_tokens=768, max_tokens=1536, count_tokens=words)

    assert [chunk.text for chunk in chunks] == [f"# Rapport\n\n{body}", "Conclusion brève."]
    assert chunks[0].token_count == 1002


def test_heading_cannot_force_a_fitting_paragraph_over_the_cap():
    body = paragraph("intégrité", 40)
    chunks = chunk_pages(
        "doc",
        [page(f"# Rapport\n\n{body}")],
        target_tokens=20,
        max_tokens=40,
        count_tokens=words,
    )

    assert chunks[-1].text == body
    assert all(chunk.token_count <= 40 for chunk in chunks)


def test_oversized_paragraph_prefers_sentence_boundaries_at_the_target():
    sentences = [
        paragraph(label, 384) + "." for label in ("Épargne", "Crédit", "Réserves", "Prix", "Taux")
    ]
    chunks = chunk_pages(
        "doc",
        [page(" ".join(sentences))],
        target_tokens=768,
        max_tokens=1536,
        count_tokens=words,
    )

    assert [chunk.token_count for chunk in chunks] == [768, 768, 384]
    assert " ".join(chunk.text for chunk in chunks) == " ".join(sentences)
    assert all(chunk.text.endswith(".") for chunk in chunks)


@pytest.mark.parametrize("text", ["économie financière 🏦 " * 300, "é漢🏦" * 400])
def test_oversized_unicode_prose_preserves_content_under_hard_cap(text):
    def utf8_tokens(value: str) -> int:
        return len(value.encode("utf-8"))

    chunks = chunk_pages(
        "doc", [page(text)], target_tokens=64, max_tokens=128, count_tokens=utf8_tokens
    )

    assert len(chunks) > 1
    assert all(0 < chunk.token_count <= 128 for chunk in chunks)
    assert "".join("".join(chunk.text.split()) for chunk in chunks) == "".join(text.split())


def test_target_keeps_subsection_heading_with_its_body_and_page_provenance():
    pages = [
        page(f"# Rapport\n\n## Première\n\n{paragraph('début', 8)}"),
        page(f"## Seconde\n\n{paragraph('suite', 8)}", number=2),
    ]
    chunks = chunk_pages("doc", pages, target_tokens=14, max_tokens=40, count_tokens=words)

    assert len(chunks) == 2
    assert chunks[1].text.startswith("## Seconde\n\nsuite")
    assert chunks[1].section_path == ("Rapport", "Seconde")
    assert [(chunk.page_number, chunk.page_end) for chunk in chunks] == [(1, 1), (2, 2)]


def test_regulatory_condition_and_consequence_can_use_the_maximum():
    condition = "a) " + paragraph("seuil", 500)
    consequence = "Sanction : " + paragraph("gourdes", 500)
    pages = [page(f"# Circulaire\n\n{condition}\n\n{consequence}")]
    legacy = chunk_pages("doc", pages, max_tokens=1536, count_tokens=words)
    targeted = chunk_pages("doc", pages, target_tokens=768, max_tokens=1536, count_tokens=words)

    assert targeted == legacy
    assert len(targeted) == 1
    assert targeted[0].chunk_type is ChunkType.provision
    assert 768 < targeted[0].token_count <= 1536
    assert condition in targeted[0].text and consequence in targeted[0].text


def test_tables_use_the_maximum_instead_of_the_prose_target():
    rows = [f"| {index} | valeur {index} |" for index in range(100)]
    pages = [page("\n".join(["| Ligne | Valeur |", "| --- | --- |", *rows]))]
    legacy = chunk_pages("doc", pages, max_tokens=300, count_tokens=words)
    targeted = chunk_pages("doc", pages, target_tokens=100, max_tokens=300, count_tokens=words)

    assert targeted == legacy
    assert len(targeted) > 1
    assert all(chunk.chunk_type is ChunkType.table for chunk in targeted)
    assert all(chunk.token_count <= 300 for chunk in targeted)
    assert any(chunk.token_count > 100 for chunk in targeted)


@pytest.mark.parametrize("target", [0, -1, 1537])
def test_invalid_targets_are_rejected_by_all_public_entry_points(target):
    with pytest.raises(ValueError, match="target_tokens"):
        chunk_pages("doc", [], target_tokens=target, max_tokens=1536)
    with pytest.raises(ValueError, match="target_tokens"):
        StructureChunker(target_tokens=target, max_tokens=1536)
    with pytest.raises(ValueError, match="target_tokens"):
        chunker_id(target_tokens=target, max_tokens=1536)


def test_identity_encodes_target_maximum_and_tokenizer_deterministically():
    options = {"target_tokens": 768, "max_tokens": 1536, "tokenizer_id": "hf:qwen"}
    identity = chunker_id(**options)

    assert identity == chunker_id(**options)
    assert "768" in identity and "1536" in identity and "hf:qwen" in identity
    assert identity != chunker_id(**{**options, "target_tokens": 512})
    assert identity != chunker_id(**{**options, "max_tokens": 2048})
    assert identity != chunker_id(**{**options, "tokenizer_id": "hf:other"})
    assert identity != chunker_id(max_tokens=1536, tokenizer_id="hf:qwen")
    assert chunker_id() == "structure-v2:448:safe-estimate-v2"


def test_direct_chunker_matches_facade_and_repeated_runs_are_deterministic():
    pages = [page("\n\n".join(paragraph(label, 384) for label in ("un", "deux", "trois")))]
    options = {"target_tokens": 768, "max_tokens": 1536, "count_tokens": words}
    chunker = StructureChunker(**options)
    first = chunker.split("doc", blocks_from_pages(pages))

    assert first == chunker.split("doc", blocks_from_pages(pages))
    assert first == chunk_pages("doc", pages, **options)
    assert len({chunk.chunk_id for chunk in first}) == len(first)


def test_explicit_none_and_equal_target_preserve_legacy_behavior():
    pages = [page(f"# Rapport\n\n{paragraph('texte', 100)}\n\nFin.")]
    options = {"max_tokens": 1536, "count_tokens": words}
    legacy = chunk_pages("doc", pages, **options)

    assert legacy == chunk_pages("doc", pages, target_tokens=None, **options)
    assert legacy == chunk_pages("doc", pages, target_tokens=1536, **options)
    assert chunker_id(target_tokens=None) == chunker_id()


def test_trailing_headings_split_without_borrowing_other_pages():
    pages = [page("# Rapport\n\nCorps du rapport.")]
    pages.extend(page("## " + paragraph(f"page{number}", 15), number) for number in (2, 3, 4))
    chunks = chunk_pages("doc", pages, target_tokens=10, max_tokens=20, count_tokens=words)

    assert [(chunk.page_number, chunk.page_end) for chunk in chunks] == [
        (1, 1),
        (2, 2),
        (3, 3),
        (4, 4),
    ]
    for chunk in chunks[1:]:
        assert chunk.text == pages[chunk.page_number - 1].text
        assert chunk.token_count <= 20


def test_long_unicode_prose_on_successive_pages_retains_exact_page_provenance():
    pages = [page(paragraph(label, 1800), number) for number, label in ((1, "épargne"), (2, "🏦"))]
    chunks = chunk_pages("doc", pages, target_tokens=768, max_tokens=1536, count_tokens=words)

    assert len(chunks) > 2
    assert all(chunk.page_number == chunk.page_end for chunk in chunks)
    for source in pages:
        parts = [chunk for chunk in chunks if chunk.page_number == source.page_number]
        assert " ".join(chunk.text for chunk in parts) == source.text
        assert all(chunk.token_count <= 1536 for chunk in parts)
    assert len({chunk.chunk_id for chunk in chunks}) == len(chunks)


def test_prose_packed_across_pages_records_both_pages():
    pages = [page(paragraph("épargne", 300)), page(paragraph("crédit", 400), 2)]
    chunks = chunk_pages("doc", pages, target_tokens=768, max_tokens=1536, count_tokens=words)

    assert len(chunks) == 1
    assert (chunks[0].page_number, chunks[0].page_end) == (1, 2)
    assert chunks[0].text == "\n\n".join(source.text for source in pages)


@pytest.mark.parametrize("target", [None, 1])
def test_unicode_codepoint_exceeding_hard_cap_is_rejected(target):
    with pytest.raises(ValueError, match="single Unicode code point"):
        chunk_pages(
            "doc",
            [page("🏦🏦")],
            target_tokens=target,
            max_tokens=2,
            count_tokens=lambda text: len(text.encode("utf-8")),
        )


def test_unicode_codepoint_can_exceed_soft_target_when_it_fits_hard_cap():
    chunks = chunk_pages(
        "doc",
        [page("🏦🏦")],
        target_tokens=1,
        max_tokens=4,
        count_tokens=lambda text: len(text.encode("utf-8")),
    )

    assert [chunk.token_count for chunk in chunks] == [4, 4]
    assert "".join(chunk.text for chunk in chunks) == "🏦🏦"
