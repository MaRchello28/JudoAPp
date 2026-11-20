"""Ippon API: backend aplikacji treningowej dla judoków (FastAPI + Supabase)."""
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .routers import auth, exercises, plans


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with httpx.AsyncClient(base_url=settings.supabase_url, timeout=20) as http:
        app.state.http = http
        yield


app = FastAPI(title="Ippon API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router)
app.include_router(exercises.router)
app.include_router(plans.router)


FIELD_NAMES = {
    "email": "e-mail", "password": "hasło", "first_name": "imię", "last_name": "nazwisko",
    "birth_date": "data urodzenia", "name": "nazwa", "date": "data", "series": "liczba serii",
    "rows": "ćwiczenia", "category": "kategoria", "reps": "powtórzenia", "weight": "obciążenie",
}


def friendly(err: dict) -> str:
    loc = [str(x) for x in err["loc"] if x not in ("body", "query", "path")]
    field = next((FIELD_NAMES[x] for x in reversed(loc) if x in FIELD_NAMES), None)
    kind = err["type"]
    if kind == "value_error":
        return err["msg"].removeprefix("Value error, ")
    what = {
        "missing": "jest wymagane",
        "string_too_short": "jest za krótkie",
        "string_too_long": "jest za długie",
        "too_short": "ma za mało elementów",
        "too_long": "ma za dużo elementów",
        "string_pattern_mismatch": "ma nieprawidłowy format",
        "greater_than_equal": "jest za małe",
        "less_than_equal": "jest za duże",
    }.get(kind, "ma nieprawidłową wartość")
    return f"Pole „{field}” {what}." if field else f"Nieprawidłowe dane: {what}."


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": friendly(exc.errors()[0])})


@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok"}
