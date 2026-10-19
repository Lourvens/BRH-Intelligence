"""Stop Modal work before the workspace credit runs out.

    uv run python scripts/spend_guard.py --check          # exit 1 if below floor
    uv run python scripts/spend_guard.py --watch          # stop apps when it is

Modal bills per second and the monthly credit is applied automatically, so the
number that matters is ``monthly_credit - metered_cost``. This polls the billing
summary and, once the remaining credit drops below the floor, stops every running
app whose name matches ``--app-prefix``.

Documents already written stay on the volume — stopping is safe, not destructive.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time


def modal(*args: str) -> str:
    return subprocess.run(["modal", *args], capture_output=True, text=True, check=True).stdout


def remaining(monthly_credit: float) -> tuple[float, float]:
    payload = json.loads(modal("billing", "summary", "--json"))
    metered = float(payload["metered_cost"])
    return metered, monthly_credit - metered


def running_apps(prefix: str) -> list[str]:
    try:
        payload = json.loads(modal("app", "list", "--json"))
    except (subprocess.CalledProcessError, json.JSONDecodeError):
        return []
    apps = []
    for app in payload if isinstance(payload, list) else payload.get("apps", []):
        state = str(app.get("state") or app.get("State") or "")
        name = str(app.get("name") or app.get("Description") or "")
        app_id = str(app.get("app_id") or app.get("App ID") or "")
        if prefix in name and "stop" not in state.lower() and app_id:
            apps.append(app_id)
    return apps


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Stop Modal apps at a credit floor.")
    parser.add_argument("--floor", type=float, default=5.0)
    parser.add_argument("--credit", type=float, default=30.0, help="Monthly credit.")
    parser.add_argument("--app-prefix", default="brh-ocr")
    parser.add_argument("--interval", type=int, default=120)
    parser.add_argument("--check", action="store_true", help="One-shot: exit 1 below the floor.")
    parser.add_argument("--watch", action="store_true", help="Poll and stop apps.")
    args = parser.parse_args(argv)

    if not (args.check or args.watch):
        parser.error("choose --check or --watch")

    while True:
        metered, left = remaining(args.credit)
        print(f"{time.strftime('%H:%M:%SZ', time.gmtime())} metered ${metered:.2f} "
              f"| remaining ${left:.2f} (floor ${args.floor:.2f})", flush=True)

        if left < args.floor:
            if args.check:
                print("below floor: do not dispatch")
                return 1
            apps = running_apps(args.app_prefix)
            for app_id in apps:
                print(f"stopping {app_id}")
                subprocess.run(["modal", "app", "stop", "-y", app_id], check=False)
            print("guard tripped; work already written stays on the volume")
            return 0

        if args.check:
            return 0
        time.sleep(args.interval)


if __name__ == "__main__":
    sys.exit(main())
