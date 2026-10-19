"""Turn PaddleOCR-VL markdown into clean, portable markdown.

PaddleOCR emits HTML tables with a style attribute on every cell, wraps captions
in `<div style=…>`, and points figures at `imgs/…` — a directory that only exists
inside each page's own folder, so those paths are dead in a merged document.

    cd experiments && uv run python paddleocr/clean.py            # raw/ → clean/
    cd experiments && uv run python paddleocr/clean.py charts     # charts/ → charts_clean/
    cd experiments && uv run python paddleocr/clean.py --drop-images

What it does:

* figures are **copied** to `<out>/assets/<sha256>/pNNN/` and rewritten as
  markdown `![](assets/…)`, so the output directory is self-contained and the
  links work from the document itself;
* wrapper `<div>`s become plain paragraphs;
* a table becomes a **pipe table** when it is simple — one `<tr>` per row, no
  `colspan`/`rowspan`, no nested table, and every row the same width;
* anything else keeps its HTML but loses every attribute, because dropping a
  merged cell would lose meaning;
* runs of blank lines collapse, and HTML entities are unescaped.

The words are never changed, with one deliberate exception: HTML entities are
unescaped, so `&#x27;` becomes `'` instead of contributing a stray `x27` token.
"""

from __future__ import annotations

import html
import pathlib
import re
import shutil
import sys
from html.parser import HTMLParser

HERE = pathlib.Path(__file__).resolve().parent
RAW = HERE / "raw"

PAGE_BREAK = "<!-- pagebreak -->"
DIV = re.compile(r"<div[^>]*>(.*?)</div>", re.S)
TABLE = re.compile(r"<table\b.*?</table>", re.S | re.I)
IMG = re.compile(r"<img\b[^>]*?src=[\"']([^\"']+)[\"'][^>]*>", re.I)


class Table(HTMLParser):
    """Collect rows and cells, and notice anything that blocks a pipe table."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.rows: list[list[str]] = []
        self.row: list[str] | None = None
        self.cell: list[str] | None = None
        self.simple = True
        self.depth = 0

    def handle_starttag(self, tag: str, attrs: dict) -> None:
        if tag == "table":
            if self.depth:  # a table inside a table cannot be a pipe table
                self.simple = False
            self.depth += 1
        elif tag == "tr":
            self.row = []
        elif tag in ("td", "th"):
            if any(name in ("colspan", "rowspan") for name, _ in attrs):
                self.simple = False
            self.cell = []

    def handle_endtag(self, tag: str) -> None:
        if tag in ("td", "th") and self.cell is not None and self.row is not None:
            self.row.append(" ".join("".join(self.cell).split()))
            self.cell = None
        elif tag == "tr" and self.row is not None:
            self.rows.append(self.row)
            self.row = None
        elif tag == "table":
            self.depth -= 1

    def handle_data(self, data: str) -> None:
        if self.cell is not None:
            self.cell.append(data)


def pipe_table(rows: list[list[str]]) -> str | None:
    width = len(rows[0]) if rows else 0
    if width == 0 or any(len(row) != width for row in rows):
        return None

    def line(cells: list[str]) -> str:
        return "| " + " | ".join(cell or " " for cell in cells) + " |"

    header, *body = rows
    rule = "|" + "|".join([" --- "] * width) + "|"
    return "\n".join([line(header), rule, *map(line, body)])


def clean_table(markup: str) -> str:
    parser = Table()
    try:
        parser.feed(markup)
    except Exception:
        return markup
    if parser.simple:
        rendered = pipe_table(parser.rows)
        if rendered:
            return rendered
    # Keep the structure, drop every attribute — only tags carry meaning here.
    return re.sub(r"<(\w+)\b[^>]*>", lambda m: f"<{m.group(1)}>", markup)


def clean_page(
    markdown: str,
    *,
    sha: str,
    page: int,
    pages_root: pathlib.Path,
    assets_root: pathlib.Path,
    drop_images: bool,
) -> tuple[str, int]:
    """Clean one page and copy its figures next to the document."""
    copied = 0

    def localise(match: re.Match) -> str:
        nonlocal copied
        if drop_images:
            return ""
        source = pages_root / sha / f"p{page:03d}" / match.group(1)
        if not source.is_file():
            return "![](image)"
        target = assets_root / sha / f"p{page:03d}" / source.name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        copied += 1
        return f"![]({target.relative_to(assets_root.parent).as_posix()})"

    text = IMG.sub(localise, markdown)
    text = DIV.sub(lambda m: m.group(1).strip() + "\n", text)
    text = TABLE.sub(lambda m: clean_table(m.group(0)), text)
    text = html.unescape(text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip(), copied


def clean_markdown(markdown: str) -> str:
    """Text-only cleanup, without touching figures."""
    text = DIV.sub(lambda m: m.group(1).strip() + "\n", markdown)
    text = TABLE.sub(lambda m: clean_table(m.group(0)), text)
    text = html.unescape(text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip() + "\n"


def clean_document(
    markdown: str,
    *,
    sha: str,
    pages_root: pathlib.Path,
    target_dir: pathlib.Path,
    drop_images: bool = False,
) -> tuple[str, int]:
    assets_root = target_dir / "assets"
    parts = markdown.split(PAGE_BREAK)
    cleaned, copied = [], 0
    for number, part in enumerate(parts, start=1):
        text, count = clean_page(
            part,
            sha=sha,
            page=number,
            pages_root=pages_root,
            assets_root=assets_root,
            drop_images=drop_images,
        )
        cleaned.append(text)
        copied += count
    return PAGE_BREAK.join(cleaned).strip() + "\n", copied


def main() -> None:
    check = "--check" in sys.argv
    drop_images = "--drop-images" in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    source_dir = pathlib.Path(args[0]) if args else RAW
    if not source_dir.is_absolute():
        source_dir = HERE / source_dir
    target_dir = (
        HERE / "clean" if source_dir == RAW else source_dir.with_name(source_dir.name + "_clean")
    )
    pages_root = source_dir / "pages"

    if not check:
        if target_dir.exists():
            shutil.rmtree(target_dir / "assets", ignore_errors=True)
        target_dir.mkdir(exist_ok=True)

    before = after = 0
    tags_before = tags_after = images = 0
    for source in sorted(source_dir.glob("*.md")):
        original = source.read_text(encoding="utf-8")
        cleaned, copied = clean_document(
            original,
            sha=source.stem,
            pages_root=pages_root,
            target_dir=target_dir,
            drop_images=drop_images,
        )
        before += len(original)
        after += len(cleaned)
        tags_before += original.count("<")
        tags_after += cleaned.count("<")
        images += copied
        if not check:
            (target_dir / source.name).write_text(cleaned, encoding="utf-8")
        print(f"{source.stem[:8]}  {len(original):>7,} → {len(cleaned):>7,} chars  {copied:>2} fig")

    print()
    print(f"total  {before:,} → {after:,} chars  ({after / before:.0%})")
    print(f"tags   {tags_before:,} → {tags_after:,} '<' occurrences")
    print(f"figs   {images} copied" + (" (dropped: --drop-images)" if drop_images else ""))
    if not check:
        print(f"written to {target_dir}")


if __name__ == "__main__":
    main()
