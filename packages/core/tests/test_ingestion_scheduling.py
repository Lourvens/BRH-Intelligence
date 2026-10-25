"""Offline contracts for bounded document scheduling."""

from concurrent.futures import ThreadPoolExecutor
from contextvars import ContextVar
from threading import Barrier, Event, Lock

import pytest
from brh_core.ingestion.scheduling import bounded_results


@pytest.mark.parametrize("workers", [0, -1])
def test_workers_must_be_positive(workers):
    with pytest.raises(ValueError, match="workers"):
        list(bounded_results([], lambda item: item, workers=workers))


def test_limit_must_be_nonnegative():
    with pytest.raises(ValueError, match="limit"):
        list(bounded_results([], lambda item: item, limit=-1))


@pytest.mark.parametrize("stopped", [False, True])
def test_zero_limit_or_initial_stop_does_not_consume_input(stopped):
    stop = Event()
    if stopped:
        stop.set()

    def items():
        pytest.fail("input must not be consumed")
        yield

    assert (
        list(bounded_results(items(), lambda item: item, limit=None if stopped else 0, stop=stop))
        == []
    )


def test_active_work_and_input_consumption_are_bounded():
    workers = 3
    started = Barrier(workers + 1)
    release = Event()
    lock = Lock()
    consumed = active = maximum = 0

    def items():
        nonlocal consumed
        for item in range(12):
            consumed += 1
            yield item

    def process(item):
        nonlocal active, maximum
        with lock:
            active += 1
            maximum = max(maximum, active)
        if item < workers:
            started.wait(timeout=5)
        assert release.wait(timeout=5)
        with lock:
            active -= 1
        return item

    with ThreadPoolExecutor(max_workers=1) as consumer:
        result = consumer.submit(lambda: list(bounded_results(items(), process, workers=workers)))
        try:
            started.wait(timeout=5)
            assert consumed == workers
            assert active == workers
        finally:
            release.set()
        assert sorted(result.result(timeout=5)) == list(range(12))
    assert maximum == workers


@pytest.mark.parametrize("workers, limit", [(1, 3), (3, 1), (4, 3), (3, 7)])
def test_success_limit_is_exact_and_skips_refill(workers, limit):
    calls = []

    def process(item):
        calls.append(item)
        return None if item % 2 == 0 else (item,)

    results = list(bounded_results(range(100), process, workers=workers, limit=limit))
    assert sum(result is not None for result in results) == limit
    assert sorted(calls) == list(range(limit * 2))
    assert len(results) == len(calls)


def test_custom_success_predicate_refills_failures_and_yields_them():
    outcomes = [("failed",), ("skipped",), ("ok",), ("failed",), ("ok",), ("extra",)]
    results = list(
        bounded_results(
            outcomes,
            lambda item: item,
            workers=3,
            limit=2,
            successful=lambda result: result == ("ok",),
        )
    )
    assert results.count(("ok",)) == 2
    assert sorted(results) == sorted(outcomes[:5])


def test_no_successes_consumes_all_items_despite_limit():
    assert list(bounded_results(range(20), lambda _: None, workers=3, limit=2)) == [None] * 20


def test_results_are_yielded_in_completion_order():
    first_started = Event()
    release_first = Event()

    def process(item):
        if item == 0:
            first_started.set()
            assert release_first.wait(timeout=5)
        else:
            assert first_started.wait(timeout=5)
        return item

    results = bounded_results(range(2), process, workers=2)
    try:
        assert next(results) == 1
    finally:
        release_first.set()
    assert list(results) == [0]


def test_stop_prevents_refill_and_drains_pending_results():
    stop = Event()
    started = Barrier(4)
    release = Event()
    calls = []

    def process(item):
        calls.append(item)
        started.wait(timeout=5)
        assert release.wait(timeout=5)
        return item

    with ThreadPoolExecutor(max_workers=1) as consumer:
        result = consumer.submit(
            lambda: list(bounded_results(range(20), process, workers=3, stop=stop))
        )
        try:
            started.wait(timeout=5)
            stop.set()
        finally:
            release.set()
        assert sorted(result.result(timeout=5)) == [0, 1, 2]
    assert sorted(calls) == [0, 1, 2]


def test_exception_propagates_only_after_pending_work_finishes():
    started = Barrier(3)
    raised = Event()
    release = Event()
    finished = Event()

    def process(item):
        started.wait(timeout=5)
        if item == 0:
            raised.set()
            raise RuntimeError("document failed")
        assert release.wait(timeout=5)
        finished.set()
        return item

    with ThreadPoolExecutor(max_workers=1) as consumer:
        result = consumer.submit(lambda: list(bounded_results(range(2), process, workers=2)))
        try:
            started.wait(timeout=5)
            assert raised.wait(timeout=5)
            assert not result.done()
        finally:
            release.set()
        with pytest.raises(RuntimeError, match="document failed"):
            result.result(timeout=5)
        assert finished.is_set()


def test_context_is_copied_per_submission_and_worker_changes_do_not_leak():
    trace = ContextVar("trace", default="unset")
    token = trace.set("parent")
    concurrent = Barrier(2)

    def process(item):
        inherited = trace.get()
        if item < 2:
            concurrent.wait(timeout=5)
        trace.set(f"worker-{item}")
        return inherited

    try:
        assert list(bounded_results(range(6), process, workers=2)) == ["parent"] * 6
        assert trace.get() == "parent"
    finally:
        trace.reset(token)


def test_refill_captures_current_consumer_context():
    trace = ContextVar("refill_trace", default="initial")
    results = bounded_results(range(2), lambda _: trace.get())
    assert next(results) == "initial"
    token = trace.set("updated")
    try:
        assert list(results) == ["updated"]
    finally:
        trace.reset(token)
