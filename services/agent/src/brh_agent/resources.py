"""Lazy process-owned agent resources, injectable for offline graph tests."""

import atexit
from threading import RLock

from brh_core.config import get_settings
from brh_core.retrieval import build_retrieval_service

from brh_agent.decisions import DecisionClient
from brh_agent.llm import ChatClient, build_chat_model


class Resources:
    def __init__(self, *, settings=None, chat=None, decisions=None, retrieval=None):
        self.settings = settings or get_settings()
        self._chat = chat
        self._decisions = decisions
        self._retrieval = retrieval
        self._pool = None
        self._lock = RLock()

    @property
    def chat(self):
        with self._lock:
            if self._chat is None:
                self._chat = ChatClient(build_chat_model(self.settings))
            return self._chat

    @property
    def decisions(self):
        with self._lock:
            if self._decisions is None:
                self._decisions = DecisionClient(self.settings)
            return self._decisions

    @property
    def retrieval(self):
        with self._lock:
            if self._retrieval is None:
                self._retrieval, self._pool = build_retrieval_service(self.settings)
            return self._retrieval

    def close(self):
        with self._lock:
            if self._chat is not None and hasattr(self._chat, "close"):
                self._chat.close()
                self._chat = None
            if self._decisions is not None and hasattr(self._decisions, "close"):
                self._decisions.close()
                self._decisions = None
            if self._pool is not None:
                self._pool.close()
                self._pool = None
                self._retrieval = None


_resources = None
_lock = RLock()


def get_resources():
    global _resources
    with _lock:
        if _resources is None:
            _resources = Resources()
        return _resources


def close_resources():
    if _resources is not None:
        _resources.close()


atexit.register(close_resources)
