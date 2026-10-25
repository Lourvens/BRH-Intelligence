"""Bounded, context-preserving scheduling for independent document work."""

from collections.abc import Callable, Iterable, Iterator
from concurrent.futures import Future, ThreadPoolExecutor
from contextvars import copy_context
from queue import Queue
from threading import Event


def bounded_results[Item, Result](
    items: Iterable[Item],
    process: Callable[[Item], Result],
    *,
    workers: int = 1,
    limit: int | None = None,
    stop: Event | None = None,
    successful: Callable[[Result], bool] = lambda result: result is not None,
) -> Iterator[Result]:
    """Yield every outcome in completion order, stopping at ``limit`` successes.

    Pending tasks reserve potential success slots, so even their side effects
    cannot overshoot the limit. Unsuccessful outcomes release their slots for
    more input. At most ``workers`` items are submitted but not yet yielded.
    A stop event prevents new submissions; already submitted work is drained.
    Exceptions propagate after the executor has waited for pending work.
    Validation occurs when iteration starts, including for an empty input.
    """
    if workers < 1:
        raise ValueError("workers must be positive")
    if limit is not None and limit < 0:
        raise ValueError("limit must be nonnegative")
    if limit == 0 or (stop is not None and stop.is_set()):
        return

    source = iter(items)
    completed: Queue[Future[Result]] = Queue(maxsize=workers)
    pending: set[Future[Result]] = set()
    successes = 0
    exhausted = False

    with ThreadPoolExecutor(max_workers=workers) as executor:
        while True:
            capacity = workers if limit is None else min(workers, limit - successes)
            while not exhausted and len(pending) < capacity and (stop is None or not stop.is_set()):
                try:
                    item = next(source)
                except StopIteration:
                    exhausted = True
                    break
                if stop is not None and stop.is_set():
                    break
                future = executor.submit(copy_context().run, process, item)
                pending.add(future)
                future.add_done_callback(completed.put_nowait)

            if not pending:
                return
            future = completed.get()
            pending.remove(future)
            result = future.result()
            if successful(result):
                successes += 1
            yield result
