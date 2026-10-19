"""PaddleOCR-VL over the six benchmark PDFs, on the Colab VM.

Per-page markdown out of the box (PaddleOCR-VL processes a PDF page by page), so
pages are joined with `<!-- pagebreak -->` and scored like Docling's output.

Uses the `transformers` engine: it runs layout + VLM through torch, which Colab
already has, instead of requiring the Paddle GPU wheel.
"""

import hashlib
import json
import pathlib
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

PAGE_BREAK = "<!-- pagebreak -->"


def page_markdown(result, directory: pathlib.Path) -> str:
    """Save one page and read back the markdown PaddleOCR wrote."""
    result.save_to_markdown(save_path=str(directory))
    files = sorted(directory.glob("*.md"))
    return files[0].read_text(encoding="utf-8") if files else ""


def build_pipeline():
    from paddleocr import PaddleOCRVL

    try:
        pipeline = PaddleOCRVL(engine="transformers")
        print("engine: transformers", flush=True)
        return pipeline
    except Exception as exc:
        print(f"transformers engine unavailable ({type(exc).__name__}: {exc}); "
              "falling back to paddle", flush=True)
        return PaddleOCRVL()


def main() -> None:
    docs = pathlib.Path("/content/documents")
    out = pathlib.Path("/content/paddleocr_out")
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

    pipeline = build_pipeline()

    rows = []
    for sha in PDFS:
        start = time.time()
        try:
            results = list(pipeline.predict(str(docs / f"{sha}.pdf")))
            parts = []
            for number, result in enumerate(results, start=1):
                directory = out / "pages" / sha / f"p{number:03d}"
                directory.mkdir(parents=True, exist_ok=True)
                parts.append(page_markdown(result, directory))

            markdown = f"\n{PAGE_BREAK}\n".join(parts)
            (out / f"{sha}.md").write_text(markdown, encoding="utf-8")
            elapsed = round(time.time() - start, 1)
            rows.append({"sha": sha, "ok": True, "pages": len(results),
                         "chars": len(markdown), "seconds": elapsed})
            print(f"{sha[:8]}  ok  {len(markdown):>7,} chars  {len(results):>3} pages  {elapsed:>7.1f}s", flush=True)
        except Exception as exc:
            import traceback

            traceback.print_exc()
            rows.append({"sha": sha, "ok": False, "error": f"{type(exc).__name__}: {exc}"})
            print(f"{sha[:8]}  FAILED  {type(exc).__name__}: {exc}", flush=True)

    (out / "results.json").write_text(
        json.dumps({"rows": rows}, indent=1, ensure_ascii=False), encoding="utf-8"
    )
    ok = [r for r in rows if r.get("ok")]
    print(f"\n{len(ok)}/{len(rows)} documents, {sum(r['chars'] for r in ok):,} chars, "
          f"{sum(r['seconds'] for r in ok):.1f}s", flush=True)

    archive = shutil.make_archive("/content/paddleocr_out", "zip", out)
    print(f"ARCHIVE {archive}  {pathlib.Path(archive).stat().st_size / 1024:.0f} kB", flush=True)


if __name__ == "__main__":
    main()
