"""Worker backlogs drain promptly and fatal provider errors stop the process."""

from threading import Event

from brh_core.config import Settings
from brh_core.embeddings.errors import EmbeddingBlockedError
from brh_core.ingestion import __main__ as cli
from brh_core.ingestion.pipeline import IngestionReport


class Pool:
    closed = False

    def open(self, **kwargs):
        pass

    def close(self):
        self.closed = True


def setup_worker(monkeypatch, runner):
    settings = Settings(_env_file=None, vector_backend="memory", embedding_provider="hashing")
    pool = Pool()
    monkeypatch.setattr(cli, "load_dotenv", lambda: None)
    monkeypatch.setattr(cli, "get_settings", lambda: settings)
    monkeypatch.setattr(cli, "open_pool", lambda _: pool)
    monkeypatch.setattr(cli, "CorpusRepository", lambda _: object())
    monkeypatch.setattr(cli, "InventoryLedger", lambda _: object())
    monkeypatch.setattr(cli, "build_vector_store", lambda _: object())
    monkeypatch.setattr(cli, "build_ingestion_workflow", runner)
    monkeypatch.setattr("brh_core.catalog.write_catalog", lambda *args: None)
    return pool


def test_full_batch_continues_without_poll_delay_then_idle_waits(monkeypatch):
    calls, waits = [], []

    class Stop(Event):
        def wait(self, seconds):
            waits.append(seconds)
            self.set()
            return True

    monkeypatch.setattr(cli, "Event", Stop)

    class Workflow:
        def invoke(self, options):
            calls.append(options)
            count = 2 if len(calls) == 1 else 1
            return {
                "inventory": None,
                "discovery_error": None,
                "ingestion": IngestionReport(3, count, 0, count, count),
            }

    pool = setup_worker(monkeypatch, lambda *args, **kwargs: Workflow())
    result = cli.main(["--index", "--from-ocr", "--limit", "2", "--workers", "4", "--watch", "30"])
    assert result is None
    assert len(calls) == 2
    assert all(options["workers"] == 4 for options in calls)
    assert waits == [30]
    assert pool.closed


def test_permanent_embedding_failure_exits_and_closes_pool(monkeypatch):
    calls = []

    class Workflow:
        def invoke(self, options):
            calls.append(options)
            raise EmbeddingBlockedError("Insufficient provider credit")

    pool = setup_worker(monkeypatch, lambda *args, **kwargs: Workflow())
    assert cli.main(["--index", "--watch", "30"]) == 2
    assert len(calls) == 1
    assert pool.closed


def test_sigterm_drains_current_cycle_without_starting_another(monkeypatch):
    import signal

    calls = []

    class Workflow:
        def invoke(self, options):
            calls.append(options)
            signal.raise_signal(signal.SIGTERM)
            return {
                "inventory": None,
                "discovery_error": None,
                "ingestion": IngestionReport(1, 1, 0, 1, 1),
            }

    previous = signal.getsignal(signal.SIGTERM)
    pool = setup_worker(monkeypatch, lambda *args, **kwargs: Workflow())
    assert cli.main(["--index", "--watch", "30"]) is None
    assert len(calls) == 1
    assert pool.closed
    assert signal.getsignal(signal.SIGTERM) == previous
