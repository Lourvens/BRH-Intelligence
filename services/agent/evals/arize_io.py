"""Arize dataset synchronization and experiment orchestration."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from arize import ArizeClient
from arize._generated.api_client.exceptions import NotFoundException
from arize.utils.resolve import NotFoundError

from .arize_eval import evaluators
from .cases import BehaviorCase
from .runner import AgentServerRunner, build_arize_task

DATASET_NAME = "brh-agent-behavior-v4"
ENV_KEYS = ("ARIZE_API_KEY", "ARIZE_SPACE_ID")


@dataclass(frozen=True)
class ArizeConnection:
    api_key: str
    space_id: str


def load_connection(env_file: Path | None = None) -> ArizeConnection:
    values = {key: os.getenv(key, "").strip() for key in ENV_KEYS}
    if env_file and env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            key, separator, raw_value = line.partition("=")
            key = key.strip()
            if separator and key in ENV_KEYS and not values[key]:
                values[key] = raw_value.strip().strip("\"'")
    missing = [key for key, value in values.items() if not value]
    if missing:
        raise ValueError(f"Missing Arize configuration: {', '.join(missing)}")
    return ArizeConnection(api_key=values["ARIZE_API_KEY"], space_id=values["ARIZE_SPACE_ID"])


def sync_dataset(connection: ArizeConnection, cases: tuple[BehaviorCase, ...]) -> Any:
    client = ArizeClient(api_key=connection.api_key)
    try:
        return client.datasets.get(dataset=DATASET_NAME, space=connection.space_id)
    except (NotFoundError, NotFoundException):
        return client.datasets.create(
            space=connection.space_id,
            name=DATASET_NAME,
            examples=[case.as_arize_example() for case in cases],
            force_http=True,
        )


def run_experiment(
    connection: ArizeConnection,
    *,
    name: str,
    runner: AgentServerRunner,
    dry_run: bool,
) -> tuple[Any, Any]:
    client = ArizeClient(api_key=connection.api_key)
    return client.experiments.run(
        name=name,
        dataset=DATASET_NAME,
        space=connection.space_id,
        task=build_arize_task(runner),
        evaluators=evaluators(),
        dry_run=dry_run,
        dry_run_count=3,
        concurrency=1,
        set_global_tracer_provider=False,
        exit_on_error=False,
        timeout=runner.timeout * runner.repetitions + 30,
        force_http=True,
    )
