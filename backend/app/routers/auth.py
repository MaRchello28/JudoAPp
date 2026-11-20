"""Rejestracja, logowanie i sesja: pośredniczy w Supabase Auth."""
from typing import Annotated

from fastapi import APIRouter, Header, Response

from ..db import Http, api_headers, auth_error, send
from ..deps import User
from ..schemas import LoginIn, RefreshIn, RegisterIn, RegisterOut, SessionOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


async def _user_out(http, token: str, supa_user: dict) -> UserOut:
    """Dane zawodnika z tabeli profiles (z zapasowym odczytem z metadanych konta)."""
    meta = supa_user.get("user_metadata") or {}
    profile = None
    resp = await send(http, "GET", "/rest/v1/profiles", token=token,
                      params={"id": f"eq.{supa_user['id']}", "select": "first_name,last_name,birth_date"})
    if resp.status_code == 200 and resp.json():
        profile = resp.json()[0]
    profile = profile or {}
    return UserOut(
        id=supa_user["id"],
        email=supa_user.get("email"),
        first_name=profile.get("first_name") or meta.get("first_name") or "",
        last_name=profile.get("last_name") or meta.get("last_name") or "",
        birth_date=profile.get("birth_date") or meta.get("birth_date") or "",
    )


async def _session_out(http, data: dict) -> SessionOut:
    return SessionOut(
        access_token=data["access_token"],
        refresh_token=data["refresh_token"],
        expires_at=data.get("expires_at"),
        user=await _user_out(http, data["access_token"], data["user"]),
    )


@router.post("/register", response_model=RegisterOut, status_code=201)
async def register(body: RegisterIn, http: Http):
    resp = await send(http, "POST", "/auth/v1/signup", json={
        "email": body.email,
        "password": body.password,
        "data": {
            "first_name": body.first_name,
            "last_name": body.last_name,
            "birth_date": body.birth_date.isoformat(),
        },
    })
    if not resp.is_success:
        raise auth_error(resp)
    data = resp.json()
    if "access_token" not in data:  # projekt wymaga potwierdzenia adresu e-mail
        return RegisterOut(needs_confirmation=True)
    return RegisterOut(needs_confirmation=False, session=await _session_out(http, data))


@router.post("/login", response_model=SessionOut)
async def login(body: LoginIn, http: Http):
    resp = await send(http, "POST", "/auth/v1/token", params={"grant_type": "password"},
                      json={"email": body.email, "password": body.password})
    if not resp.is_success:
        raise auth_error(resp)
    return await _session_out(http, resp.json())


@router.post("/refresh", response_model=SessionOut)
async def refresh(body: RefreshIn, http: Http):
    resp = await send(http, "POST", "/auth/v1/token", params={"grant_type": "refresh_token"},
                      json={"refresh_token": body.refresh_token})
    if not resp.is_success:
        raise auth_error(resp)
    return await _session_out(http, resp.json())


@router.post("/logout", status_code=204)
async def logout(http: Http, authorization: Annotated[str | None, Header()] = None):
    """Kończy tę sesję w Supabase. Błędy ignorujemy, bo użytkownik i tak się wylogowuje."""
    if authorization and authorization.lower().startswith("bearer "):
        await send(http, "POST", "/auth/v1/logout", token=authorization[7:].strip(), params={"scope": "local"})
    return Response(status_code=204)


@router.get("/me", response_model=UserOut)
async def me(user: User, http: Http):
    return await _user_out(http, user.token, {"id": user.id, "email": user.email, "user_metadata": user.metadata})
