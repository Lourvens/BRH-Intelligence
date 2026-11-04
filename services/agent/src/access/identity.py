"""Stable anonymous identities for public, unauthenticated assistant access."""

from __future__ import annotations

import hashlib
import hmac

from starlette.requests import Request


def client_address(request: Request, trust_proxy: bool) -> str:
    """Return the address a trusted proxy reports, or the direct peer."""
    if trust_proxy:
        forwarded = request.headers.get("x-forwarded-for", "")
        if forwarded:
            # The proxy appends the address it saw; the right-most hop is
            # therefore the one we can trust, not a client-supplied prefix.
            return forwarded.rsplit(",", 1)[-1].strip()
    return request.client.host if request.client else "unknown"


def anonymous_identity(address: str, salt: str) -> str:
    """Hash an address so the usage ledger never stores raw client IPs."""
    digest = hmac.new(
        salt.encode("utf-8"), address.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    return f"anon-{digest[:32]}"


def request_identity(request: Request, trust_proxy: bool, salt: str) -> str:
    return anonymous_identity(client_address(request, trust_proxy), salt)
