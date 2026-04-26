import os
import time
from typing import Any, Optional

import httpx
import jwt
from fastapi import HTTPException, Request
from jwt import PyJWKClient

CLERK_JWKS_URL = os.environ.get("CLERK_JWKS_URL", "")
CLERK_ISSUER = os.environ.get("CLERK_ISSUER", "")
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
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=CLERK_ISSUER,
            options={"verify_aud": False},
        )
        return claims
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"invalid token: {e}")
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="auth provider unreachable")


async def clerk_auth_middleware(request: Request, call_next):
    if not AUTH_ENABLED:
        return await call_next(request)

    path = request.url.path
    if path in PUBLIC_PATHS or path.startswith(ADMIN_PREFIX):
        return await call_next(request)
    if request.method == "OPTIONS":
        return await call_next(request)

    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        from fastapi.responses import JSONResponse
        return JSONResponse({"detail": "unauthenticated"}, status_code=401)

    token = auth[len("Bearer "):].strip()
    try:
        claims = _verify_token(token)
    except HTTPException as e:
        from fastapi.responses import JSONResponse
        return JSONResponse({"detail": e.detail}, status_code=e.status_code)

    request.state.user_id = claims.get("sub")
    request.state.claims = claims
    return await call_next(request)
