"""Anonymous, address-scoped identity for public assistant requests."""

from __future__ import annotations

from brh_core.config import get_settings
from langgraph_sdk import Auth
from starlette.requests import Request

from access.identity import request_identity

auth = Auth()


@auth.authenticate
async def authenticate(request: Request) -> Auth.types.MinimalUserDict:
    """Populate ``langgraph_auth_user`` with the quota identity.

    There is no end-user login: the trusted proxy address is the only stable
    server-side identity available. Hashing it keeps raw IPs out of the ledger.
    """
    settings = get_settings()
    return {
        "identity": request_identity(
            request,
            settings.rate_limit_trust_proxy,
            settings.quota_identity_salt.get_secret_value(),
        )
    }
