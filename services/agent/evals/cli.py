"""Operator CLI for validating, synchronizing and running agent behavior evals."""

from __future__ import annotations

import argparse
from datetime import UTC, datetime
from pathlib import Path

from .arize_io import DATASET_NAME, load_connection, run_experiment, sync_dataset
from .cases import DATASET_PATH, load_cases
from .runner import AgentServerRunner

REPO_ROOT = Path(__file__).resolve().parents[3]


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description=__doc__)
    root.add_argument("--dataset", type=Path, default=DATASET_PATH)
    root.add_argument("--env-file", type=Path, default=REPO_ROOT / ".env")
    commands = root.add_subparsers(dest="command", required=True)
    commands.add_parser("validate", help="Validate the local reviewed JSONL dataset")
    commands.add_parser("sync", help="Create the versioned dataset in Arize if absent")
    run = commands.add_parser("run", help="Run repeated live trials as an Arize experiment")
    run.add_argument("--endpoint", default="http://localhost:2024/runs/wait")
    run.add_argument("--assistant-id", default="agent")
    run.add_argument("--repetitions", type=int, default=3)
    run.add_argument("--timeout", type=float, default=210)
    run.add_argument("--name", default="")
    run.add_argument("--dry-run", action="store_true")
    return root


def main() -> None:
    args = parser().parse_args()
    cases = load_cases(args.dataset)
    if args.command == "validate":
        categories = sorted({case.category for case in cases})
        print(f"Validated {len(cases)} cases across {len(categories)} categories.")
        print("Categories: " + ", ".join(categories))
        return
    connection = load_connection(args.env_file)
    if args.command == "sync":
        dataset = sync_dataset(connection, cases)
        print(f"Arize dataset ready: {getattr(dataset, 'name', DATASET_NAME)}")
        print(f"Dataset ID: {getattr(dataset, 'id', 'unknown')}")
        return
    runner = AgentServerRunner(
        endpoint=args.endpoint,
        assistant_id=args.assistant_id,
        repetitions=args.repetitions,
        timeout=args.timeout,
    )
    name = args.name or f"agent-live-{datetime.now(UTC):%Y%m%d-%H%M%S}"
    experiment, dataframe = run_experiment(
        connection, name=name, runner=runner, dry_run=args.dry_run
    )
    print(f"Experiment: {getattr(experiment, 'name', name)}")
    print(f"Rows: {len(dataframe)}")


if __name__ == "__main__":
    main()
