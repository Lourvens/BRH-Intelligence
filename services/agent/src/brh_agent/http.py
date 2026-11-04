"""Stable Agent Server entry point; implementation lives in ``api.app``."""

from brh_agent.api.app import app, create_app

__all__ = ["app", "create_app"]
