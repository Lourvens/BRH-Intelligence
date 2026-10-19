"""Smoke test: PaddleOCR-VL on the one-page scan, transformers engine."""

import pathlib
import time
import urllib.request

SHA = "1a84a9a73493ae39e02993fbffddb76baee572cfa957193b80b51c8dcd78280a"
URL = "https://www.brh.ht/wp-content/uploads/2018/08/lc_02.pdf"


def main() -> None:
    docs = pathlib.Path("/content/documents")
    docs.mkdir(exist_ok=True)
    pdf = docs / f"{SHA}.pdf"
    if not pdf.is_file():
        req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=120) as response:
            pdf.write_bytes(response.read())

    from paddleocr import PaddleOCRVL

    start = time.time()
    pipeline = PaddleOCRVL(engine="transformers")
    print(f"init {time.time() - start:.1f}s", flush=True)

    start = time.time()
    results = list(pipeline.predict(str(pdf)))
    print(f"predict {time.time() - start:.1f}s  pages {len(results)}", flush=True)

    out = pathlib.Path("/content/pp_smoke")
    (out / "p001").mkdir(parents=True, exist_ok=True)
    results[0].save_to_markdown(save_path=str(out / "p001"))
    files = sorted((out / "p001").glob("*.md"))
    print("files:", [f.name for f in files], flush=True)
    if files:
        print("\n" + files[0].read_text(encoding="utf-8")[:1200], flush=True)


if __name__ == "__main__":
    main()
