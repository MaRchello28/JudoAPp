"""Plany treningu motorycznego zawodnika."""
from uuid import UUID

from fastapi import APIRouter, HTTPException, Response

from ..db import Http, ensure_ok, send
from ..deps import User
from ..schemas import PlanIn, PlanOut

router = APIRouter(prefix="/plans", tags=["plans"])

PLAN_SELECT = (
    "id,name,plan_date,series_count,created_at,"
    "training_plan_exercises(position,exercise_id,exercises(name),training_sets(set_number,reps,weight))"
)


def to_plan(r: dict) -> dict:
    """Wiersz z bazy (z zagnieżdżonymi ćwiczeniami i seriami) -> plan w kształcie API."""
    series = r["series_count"]
    rows = []
    for pe in sorted(r["training_plan_exercises"], key=lambda x: x["position"]):
        sets = [{"reps": None, "weight": None} for _ in range(series)]
        for s in pe["training_sets"]:
            n = s["set_number"]
            if 1 <= n <= series:
                sets[n - 1] = {"reps": s["reps"], "weight": float(s["weight"]) if s["weight"] is not None else None}
        exercise = pe.get("exercises")
        rows.append({
            "exercise_id": pe.get("exercise_id"),
            "exercise_name": exercise["name"] if exercise else None,
            "sets": sets,
        })
    return {"id": r["id"], "name": r["name"], "date": r["plan_date"], "series": series, "rows": rows}


def rpc_payload(plan: PlanIn, plan_id: UUID | None) -> dict:
    """Dane dla funkcji save_training_plan w bazie (zapis planu w jednej transakcji)."""
    return {"p_plan": {
        "id": str(plan_id) if plan_id else None,
        "name": plan.name,
        "plan_date": plan.date.isoformat(),
        "series_count": plan.series,
        "rows": [
            {
                "exercise_id": str(r.exercise_id) if r.exercise_id else None,
                "sets": [{"reps": s.reps, "weight": s.weight} for s in r.sets],
            }
            for r in plan.rows
        ],
    }}


async def fetch_plan(http, token: str, plan_id: UUID) -> dict | None:
    resp = ensure_ok(await send(http, "GET", "/rest/v1/training_plans", token=token,
                                params={"select": PLAN_SELECT, "id": f"eq.{plan_id}"}))
    data = resp.json()
    return to_plan(data[0]) if data else None


@router.get("", response_model=list[PlanOut])
async def list_plans(user: User, http: Http):
    resp = ensure_ok(await send(http, "GET", "/rest/v1/training_plans", token=user.token,
                                params={"select": PLAN_SELECT, "order": "plan_date.desc,created_at.desc"}))
    return [to_plan(r) for r in resp.json()]


@router.get("/{plan_id}", response_model=PlanOut)
async def get_plan(plan_id: UUID, user: User, http: Http):
    plan = await fetch_plan(http, user.token, plan_id)
    if plan is None:
        raise HTTPException(404, "Nie znaleziono planu.")
    return plan


@router.post("", response_model=PlanOut, status_code=201)
async def create_plan(body: PlanIn, user: User, http: Http):
    resp = ensure_ok(await send(http, "POST", "/rest/v1/rpc/save_training_plan", token=user.token,
                                json=rpc_payload(body, None)))
    return await fetch_plan(http, user.token, UUID(resp.json()))


@router.put("/{plan_id}", response_model=PlanOut)
async def update_plan(plan_id: UUID, body: PlanIn, user: User, http: Http):
    ensure_ok(await send(http, "POST", "/rest/v1/rpc/save_training_plan", token=user.token,
                         json=rpc_payload(body, plan_id)))
    return await fetch_plan(http, user.token, plan_id)


@router.delete("/{plan_id}", status_code=204)
async def delete_plan(plan_id: UUID, user: User, http: Http):
    resp = ensure_ok(await send(http, "DELETE", "/rest/v1/training_plans", token=user.token,
                                headers={"Prefer": "return=representation"}, params={"id": f"eq.{plan_id}"}))
    if not resp.json():
        raise HTTPException(404, "Nie znaleziono planu.")
    return Response(status_code=204)
