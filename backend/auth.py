"""
auth.py — FastAPI JWT Authentication Dependency

Verifies Supabase-issued JWTs on every protected request.
Extracts the user_id (UUID) so every endpoint knows which tenant is calling.

Usage:
    from .auth import get_current_user

    @app.get("/api/something")
    async def my_endpoint(current_user: dict = Depends(get_current_user)):
        user_id = current_user["sub"]
"""

import os
import jwt
from fastapi import HTTPException, Header
from typing import Optional


# Cache for JWKS client to avoid recreating it on every request
_jwks_client = None

def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """
    FastAPI dependency — validates the Supabase JWT from the Authorization header.
    Supports both HS256 (symmetric) and ES256 (asymmetric) algorithms.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing or malformed. Expected: 'Bearer <token>'",
        )

    token = authorization.split(" ", 1)[1].strip()
    
    # Pre-parse the header to check the algorithm
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token header: {str(e)}")

    if alg == "ES256":
        # Handle Asymmetric ES256 (Standard for many Supabase projects)
        global _jwks_client
        if _jwks_client is None:
            supabase_url = (os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL") or "").rstrip("/")
            if not supabase_url:
                raise HTTPException(status_code=500, detail="SUPABASE_URL not configured")
            jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
            from jwt import PyJWKClient
            _jwks_client = PyJWKClient(jwks_url)
        
        try:
            signing_key = _jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256"],
                audience="authenticated",
            )
            return payload
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"ES256 verification failed: {str(e)}")

    # Fallback to HS256 (Symmetric)
    jwt_secret = os.getenv("SUPABASE_JWT_SECRET") or os.getenv("JWT_SECRET") or os.getenv("SUPABASE_AUTH_JWT_SECRET")
    if not jwt_secret:
        raise HTTPException(
            status_code=500,
            detail="Server misconfiguration: SUPABASE_JWT_SECRET is not set.",
        )

    try:
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256", "HS384", "HS512"],
            audience="authenticated",
        )
        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Session expired. Please log in again.",
        )
    except jwt.InvalidAudienceError:
        raise HTTPException(
            status_code=401,
            detail="Invalid token audience.",
        )
    except jwt.InvalidAlgorithmError as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid algorithm: {alg}. Expected HS256/384/512 or ES256.",
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid token: {str(e)}",
        )

def get_optional_current_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """
    Optional version of get_current_user. Returns None if unauthenticated instead of 401.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        return get_current_user(authorization)
    except HTTPException:
        return None
