"""Render a contact sheet of the selected benchmark documents.

One page per document — enough to see what the set actually contains, which is
the only way to sanity-check a class label derived from heuristics.

    uv run python experiments/gold/contact_sheet.py [page-offset]
"""

from __future__ import annotations

import json
import pathlib
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.image as mpimg
import matplotlib.pyplot as plt
import pymupdf

HERE = pathlib.Path(__file__).resolve().parent
TMP = pathlib.Path("/tmp/opencode/render")
OFFSET = int(sys.argv[1]) if len(sys.argv) > 1 else 0


def main() -> None:
    manifest = json.loads((HERE / "manifest.json").read_text())
    entries = list(manifest["eval"].items())
    TMP.mkdir(parents=True, exist_ok=True)

    columns = 6
    rows = (len(entries) + columns - 1) // columns
    figure, axes = plt.subplots(rows, columns, figsize=(4 * columns, 3.4 * rows))
    axes = axes.ravel()

    for axis, (sha, entry) in zip(axes, entries, strict=False):
        path = HERE / entry["file"]
        doc = pymupdf.open(path)
        try:
            number = min(1 + OFFSET, doc.page_count)
            page = doc[number - 1]
            zoom = 620 / page.rect.width
            pixmap = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom))
        finally:
            doc.close()
        out = TMP / f"{sha[:8]}-p{number}.png"
        pixmap.save(out)
        axis.imshow(mpimg.imread(out))
        short = ", ".join(
            c.replace("digital/", "").replace("scan/", "S:") for c in entry["classes"]
        )
        axis.set_title(
            f"{sha[:8]}  {entry['pages']}p  {entry['year']}\n{short}",
            fontsize=8,
        )
        axis.axis("off")

    for axis in axes[len(entries) :]:
        axis.axis("off")

    figure.tight_layout()
    target = pathlib.Path("/tmp/opencode/set.png")
    figure.savefig(target, dpi=62)
    print(f"wrote {target}  ({len(entries)} documents)")


if __name__ == "__main__":
    main()
