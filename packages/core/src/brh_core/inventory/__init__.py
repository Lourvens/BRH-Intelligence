"""BRH web inventory: discover and download documents from ``brh.ht``.

The front half of the corpus pipeline. It enumerates PDFs through the
WordPress REST API, stores the bytes content-addressed, and logs every URL
with its dates and fetch status so nothing is downloaded twice.
"""

from brh_core.inventory.discovery import MediaItem, RemoteStat, WordPressMediaClient
from brh_core.inventory.ledger import InventoryLedger, UrlState
from brh_core.inventory.pipeline import (
    InventoryReport,
    run_inventory,
    stratified_sample,
)
from brh_core.inventory.store import ContentStore, SavedContent

__all__ = [
    "ContentStore",
    "InventoryLedger",
    "InventoryReport",
    "MediaItem",
    "RemoteStat",
    "SavedContent",
    "UrlState",
    "WordPressMediaClient",
    "run_inventory",
    "stratified_sample",
]
