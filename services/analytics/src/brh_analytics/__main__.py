"""``python -m brh_analytics`` — regenerate every design asset.

    python -m brh_analytics                        # palette sheet + every family
    python -m brh_analytics --size portrait        # a different canvas
    python -m brh_analytics --family inventory     # one family only
    python -m brh_analytics --palette-only         # just the swatch sheet

Output is grouped by family: ``out/inventory/archive-square.png``.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from brh_analytics import families, posts, swatches

OUT_DIR = Path(__file__).resolve().parents[2] / "out"


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="brh_analytics", description=__doc__)
    parser.add_argument(
        "--size",
        action="append",
        choices=sorted(posts.POST_SIZES),
        help="canvas to render (repeatable; default square)",
    )
    parser.add_argument(
        "--family",
        action="append",
        choices=[family.slug for family in families.FAMILIES],
        help="family to render (repeatable; default all)",
    )
    parser.add_argument("--out", type=Path, default=OUT_DIR, help="where the posts go")
    parser.add_argument("--palette-only", action="store_true", help="skip the posts")
    args = parser.parse_args(argv)

    print(swatches.render())
    if args.palette_only:
        return

    sizes = tuple(args.size or ["square"])
    per_family = tuple(args.family or [family.slug for family in families.FAMILIES])
    for family in families.FAMILIES:
        if family.slug not in per_family:
            continue
        print(f"{family.slug} — {family.title} : {family.subtitle}")
        for path in posts.render_family(family, sizes=sizes, directory=args.out):
            print(f"  {path}")


if __name__ == "__main__":
    main()
