"""Run MinerU over the six benchmark PDFs on the Colab VM, then zip the output.

Guarded by `__main__` because vLLM spawns its engine core as a child process.
Base64-inlined images are collapsed to `![](image)` so the markdown stays text —
MinerU emits the whole page raster otherwise, which would swamp the output.
"""

import hashlib
import json
import pathlib
import re
import shutil
import time
import urllib.request

PDFS = {
    "110b25ca611ddf3dd50eda474d60e4ba5c427c3d3978ed0a14292d8f926ee349": "https://www.brh.ht/wp-content/uploads/NOTE-MENSUELLE-DINFLATION-DU-MOIS-DE-NOVEMBRE-2025.pdf",
    "1a84a9a73493ae39e02993fbffddb76baee572cfa957193b80b51c8dcd78280a": "https://www.brh.ht/wp-content/uploads/2018/08/lc_02.pdf",
    "63b4ca02772a885f4fcf3a68ed6264af1b8bf2fdac25a56a0d1b08ac05d84451": "https://www.brh.ht/wp-content/uploads/Note-mensuelle-dinflation-septembre-2022_f.pdf",
    "6ab9508ca873d1055feb678003fe0fe56e6ecc518bdb48793fbd86d1537c7d67": "https://www.brh.ht/wp-content/uploads/Circulaire-122-pdf.pdf",
    "f2d799b9527eef9caaede5f0c5ee0afe4eb897ff8de972560f7b6e47e58faef9": "https://www.brh.ht/wp-content/uploads/2018/08/circulaire_95-1a.pdf",
    "f31dfee9575ff1197dc5ff28cc4d42b85d79234f9c58cb2f12a202768bc4ae01": "https://www.brh.ht/wp-content/uploads/pibsecteur.pdf",
}

TIER = "standard"
OCR_MODE = "auto"
INLINE_IMAGE = re.compile(r"!\[[^\]]*\]\(data:image/[^)]*\)")


def strip_inline_images(markdown: str) -> str:
    return INLINE_IMAGE.sub("![](image)", markdown)


def main() -> None:
    docs = pathlib.Path("/content/documents")
    out = pathlib.Path("/content/mineru_out")
    docs.mkdir(exist_ok=True)
    out.mkdir(exist_ok=True)

    for sha, url in PDFS.items():
        path = docs / f"{sha}.pdf"
        if not path.is_file():
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=120) as response:
                path.write_bytes(response.read())
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        print(f"{sha[:8]}  {'ok' if digest == sha else 'SHA MISMATCH'}  {path.stat().st_size / 1024:.0f} kB", flush=True)

    from mineru.parser import parse

    rows = []
    for sha in PDFS:
        start = time.time()
        try:
            result = parse(docs / f"{sha}.pdf", tier=TIER, ocr_mode=OCR_MODE)
            markdown = strip_inline_images(result.markdown())
            payload = result.to_json()
            (out / f"{sha}.md").write_text(markdown, encoding="utf-8")
            (out / f"{sha}.json").write_text(payload, encoding="utf-8")
            try:
                pages = len(json.loads(payload).get("pages") or [])
            except Exception:
                pages = None
            elapsed = round(time.time() - start, 1)
            rows.append({"sha": sha, "ok": True, "pages": pages, "chars": len(markdown), "seconds": elapsed})
            print(f"{sha[:8]}  ok  {len(markdown):>7,} chars  {str(pages):>3} pages  {elapsed:>6.1f}s", flush=True)
        except Exception as exc:
            import traceback

            traceback.print_exc()
            rows.append({"sha": sha, "ok": False, "error": f"{type(exc).__name__}: {exc}"})
            print(f"{sha[:8]}  FAILED  {type(exc).__name__}: {exc}", flush=True)

    (out / "results.json").write_text(
        json.dumps({"tier": TIER, "ocr_mode": OCR_MODE, "rows": rows}, indent=1, ensure_ascii=False),
        encoding="utf-8",
    )

    print("\nsuccesses:", sum(1 for r in rows if r.get("ok")), "/", len(rows), flush=True)
    print("total chars:", sum(r.get("chars", 0) for r in rows), flush=True)
    print("total seconds:", sum(r.get("seconds", 0) for r in rows), flush=True)

    archive = shutil.make_archive("/content/mineru_out", "zip", out)
    print(f"ARCHIVE {archive}  {pathlib.Path(archive).stat().st_size / 1024:.0f} kB", flush=True)


if __name__ == "__main__":
    main()
