"""Zależność sprawdzająca, kto wywołuje API: token zalogowanego zawodnika sprawdza Supabase Auth."""
from dataclasses import dataclass, field
from typing import Annotated

from fastapi import Depends, Header, HTTPException

from .db import Http, send


@dataclass
class CurrentUser:
    id: str
    email: str | None
    token: str
    metadata: dict = field(default_factory=dict)


async def current_user(http: Http, authorization: Annotated[str | None, Header()] = None) -> CurrentUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Zaloguj się, aby kontynuować.")
    token = authorization[7:].strip()
    resp = await send(http, "GET", "/auth/v1/user", token=token)
    if resp.status_code >= 500:
        raise HTTPException(502, "Usługa logowania jest chwilowo niedostępna.")
    if resp.status_code != 200:
        raise HTTPException(401, "Sesja wygasła. Zaloguj się ponownie.")
    data = resp.json()
    return CurrentUser(id=data["id"], email=data.get("email"), token=token, metadata=data.get("user_metadata") or {})


User = Annotated[CurrentUser, Depends(current_user)]
