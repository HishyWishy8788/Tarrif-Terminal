import os
import time
from typing import Any, Optional

import httpx
import jwt
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from jwt import PyJWKClient

CLERK_JWKS_URL = os.environ.get("CLERK_JWKS_URL", "")
CLERK_ISSUER = os.environ.get("CLERK_ISSUER", "")
CLERK_AUDIENCE = os.environ.get("CLERK_AUDIENCE", "")
ADMIN_CLAIM = os.environ.get("CLERK_ADMIN_CLAIM", "admin")
AUTH_ENABLED = bool(CLERK_JWKS_URL and CLERK_ISSUER)

PUBLIC_PATHS = {"/api/health", "/api/auth/status", "/api/severity"}
ADMIN_PREFIX = "/api/admin/"

_jwks_client: Optional[PyJWKClient] = None
_jwks_last_fetched: float = 0
_JWKS_CACHE_TTL = 600


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client, _jwks_last_fetched
    now = time.time()
    if _jwks_client is None or now - _jwks_last_fetched > _JWKS_CACHE_TTL:
        _jwks_client = PyJWKClient(CLERK_JWKS_URL)
        _jwks_last_fetched = now
    return _jwks_client


def _verify_token(token: str) -> dict[str, Any]:
    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        decode_kwargs: dict[str, Any] = {
            "algorithms": ["RS256"],
            "issuer": CLERK_ISSUER,
        }
        if CLERK_AUDIENCE:
            decode_kwargs["audience"] = CLERK_AUDIENCE
            decode_kwargs["options"] = {"verify_aud": True}
        else:
            decode_kwargs["options"] = {"verify_aud": False}
        return jwt.decode(token, signing_key.key, **decode_kwargs)
    except jwt.ExpiredSignatureError:
        # Generic message — distinguishing expired vs invalid is an info leak.
        raise HTTPException(status_code=401, detail="unauthenticated")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="unauthenticated")
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="auth provider unreachable")


def _is_admin(claims: dict[str, Any]) -> bool:
    """Look for an admin marker in the JWT claims.

    Accepts any of: top-level ADMIN_CLAIM == True, claims['role'] == 'admin',
    'admin' present in claims['roles']/['permissions'] arrays. Tune to whatever
    Clerk template you actually publish.
    """
    if claims.get(ADMIN_CLAIM) is True:
        return True
    if claims.get("role") == "admin":
        return True
    for key in ("roles", "permissions"):
        val = claims.get(key)
        if isinstance(val, list) and "admin" in val:
            return True
    return False


async def clerk_auth_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)

    path = request.url.path
    if path in PUBLIC_PATHS:
        return await call_next(request)

    is_admin_path = path.startswith(ADMIN_PREFIX)

    # When auth is disabled (Phase-1 dev), allow through but stamp anonymous.
    if not AUTH_ENABLED:
        request.state.user_id = "anonymous"
        request.state.is_admin = True  # local dev convenience
        return await call_next(request)

    # Auth enabled: every non-public path requires a valid JWT.
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        return JSONResponse({"detail": "unauthenticated"}, status_code=401)

    token = auth[len("Bearer "):].strip()
    try:
        claims = _verify_token(token)
    except HTTPException as e:
        return JSONResponse({"detail": e.detail}, status_code=e.status_code)

    request.state.user_id = claims.get("sub")
    request.state.claims = claims
    request.state.is_admin = _is_admin(claims)

    if is_admin_path and not request.state.is_admin:
        return JSONResponse({"detail": "forbidden"}, status_code=403)

    return await call_next(request)
