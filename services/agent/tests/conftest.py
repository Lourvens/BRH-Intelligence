"""Make the flat src layout and the shared test support package importable."""

import sys
from pathlib import Path

TESTS = Path(__file__).resolve().parent
AGENT_ROOT = TESTS.parent

for entry in (AGENT_ROOT / "src", TESTS):
    if str(entry) not in sys.path:
        sys.path.insert(0, str(entry))
