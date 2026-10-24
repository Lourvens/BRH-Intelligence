"""Inspect grounded retrieval from the configured corpus without an LLM."""

import argparse
import json

from brh_core.retrieval.service import build_retrieval_service


def main(argv=None):
    parser = argparse.ArgumentParser(description="Search BRH corpus with canonical citations.")
    parser.add_argument("question")
    parser.add_argument("--top-k", type=int, default=6)
    args = parser.parse_args(argv)
    service, pool = build_retrieval_service()
    try:
        print(
            json.dumps(
                service.search(args.question, top_k=args.top_k).model_dump(mode="json"),
                ensure_ascii=False,
                indent=2,
            )
        )
    finally:
        pool.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
