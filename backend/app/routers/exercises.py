"""Baza ćwiczeń: wspólne i własne ćwiczenia zawodnika."""
from fastapi import APIRouter

from ..db import Http, ensure_ok, send
from ..deps import User
from ..schemas import ExerciseIn, ExerciseOut

router = APIRouter(prefix="/exercises", tags=["exercises"])


def _out(row: dict) -> dict:
    return {"id": row["id"], "name": row["name"], "category": row["category"], "own": row.get("owner_id") is not None}


@router.get("", response_model=list[ExerciseOut])
async def list_exercises(user: User, http: Http):
    resp = ensure_ok(await send(http, "GET", "/rest/v1/exercises", token=user.token,
                                params={"select": "id,name,category,owner_id", "order": "category,name"}))
    return [_out(r) for r in resp.json()]


@router.post("", response_model=ExerciseOut, status_code=201)
async def create_exercise(body: ExerciseIn, user: User, http: Http):
    resp = ensure_ok(await send(http, "POST", "/rest/v1/exercises", token=user.token,
                                headers={"Prefer": "return=representation"},
                                json={"name": body.name, "category": body.category}))
    return _out(resp.json()[0])
