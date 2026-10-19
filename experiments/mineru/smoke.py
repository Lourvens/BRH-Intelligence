"""MinerU smoke test on the Colab VM: page 9 of the 2026 inflation note.

The body sits behind `if __name__ == "__main__":` on purpose — vLLM spawns its
engine core as a child process, and without the guard the child re-imports
`__main__` and re-runs the parse.
"""

import hashlib
import importlib.metadata
import pathlib
import time
import urllib.request

SHA = "110b25ca611ddf3dd50eda474d60e4ba5c427c3d3978ed0a14292d8f926ee349"
URL = "https://www.brh.ht/wp-content/uploads/NOTE-MENSUELLE-DINFLATION-DU-MOIS-DE-NOVEMBRE-2025.pdf"


def main() -> None:
    docs = pathlib.Path("/content/documents")
    docs.mkdir(exist_ok=True)
    pdf = docs / f"{SHA}.pdf"

    if not pdf.is_file():
        req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=120) as response:
            pdf.write_bytes(response.read())
    digest = hashlib.sha256(pdf.read_bytes()).hexdigest()
    print(f"sha256 {'ok' if digest == SHA else 'MISMATCH'}  {pdf.stat().st_size / 1024:.0f} kB", flush=True)

    from mineru.parser import parse

    print("mineru", importlib.metadata.version("mineru"), flush=True)

    start = time.time()
    result = parse(pdf, tier="standard", ocr_mode="auto", page_range="9")
    elapsed = time.time() - start
    markdown = result.markdown()
    pathlib.Path("/content/smoke_p9.md").write_text(markdown, encoding="utf-8")

    print(f"\nelapsed {elapsed:.1f}s  chars {len(markdown)}\n", flush=True)
    print(markdown[:2000], flush=True)
    print("\nresult attrs:", [a for a in dir(result) if not a.startswith("_")], flush=True)


if __name__ == "__main__":
    main()
