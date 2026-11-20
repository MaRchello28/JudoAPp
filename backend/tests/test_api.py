"""Testy API z atrapą Supabase (bez prawdziwej bazy i sieci). Uruchomienie: pytest (w folderze backend)."""
import json
import os

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")

import httpx  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

TOKEN = "good-token"
UID = "11111111-1111-1111-1111-111111111111"
EX_ID = "22222222-2222-2222-2222-222222222222"
PLAN_ID = "33333333-3333-3333-3333-333333333333"
SUPA_USER = {"id": UID, "email": "jan@example.com",
             "user_metadata": {"first_name": "Jan", "last_name": "Kowalski", "birth_date": "2000-01-02"}}
PLAN_ROW = {
    "id": PLAN_ID, "name": "Siła", "plan_date": "2026-11-20", "series_count": 3, "created_at": "x",
    "training_plan_exercises": [
        {"position": 1, "exercise_id": None, "exercises": None, "training_sets": []},
        {"position": 0, "exercise_id": EX_ID, "exercises": {"name": "Martwy ciąg"},
         "training_sets": [{"set_number": 1, "reps": 5, "weight": 100},
                           {"set_number": 3, "reps": 2, "weight": "110.50"}]},
    ],
}
seen = []


def supabase(req: httpx.Request) -> httpx.Response:
    path, auth = req.url.path, req.headers.get("authorization")
    seen.append((req.method, path, req))
    if path == "/auth/v1/token":
        body = json.loads(req.content)
        if req.url.params["grant_type"] == "password" and body["password"] == "dobrehaslo1":
            return httpx.Response(200, json={"access_token": TOKEN, "refresh_token": "r1", "expires_at": 123, "user": SUPA_USER})
        return httpx.Response(400, json={"code": 400, "error_code": "invalid_credentials", "msg": "Invalid login credentials"})
    if path == "/auth/v1/signup":
        return httpx.Response(200, json={"id": UID, "email": "jan@example.com"})
    if path == "/auth/v1/user":
        return httpx.Response(200, json=SUPA_USER) if auth == f"Bearer {TOKEN}" else httpx.Response(401, json={"msg": "bad"})
    if path == "/auth/v1/logout":
        return httpx.Response(204)
    if auth != f"Bearer {TOKEN}":
        return httpx.Response(401, json={"code": "PGRST301", "message": "JWT expired"})
    if path == "/rest/v1/profiles":
        return httpx.Response(200, json=[{"first_name": "Jan", "last_name": "Kowalski", "birth_date": "2000-01-02"}])
    if path == "/rest/v1/exercises" and req.method == "GET":
        return httpx.Response(200, json=[{"id": EX_ID, "name": "Martwy ciąg", "category": "Nogi", "owner_id": None}])
    if path == "/rest/v1/exercises" and req.method == "POST":
        return httpx.Response(409, json={"code": "23505", "message": "duplicate key"})
    if path == "/rest/v1/rpc/save_training_plan":
        return httpx.Response(200, json=PLAN_ID)
    if path == "/rest/v1/training_plans" and req.method == "GET":
        return httpx.Response(200, json=[PLAN_ROW])
    if path == "/rest/v1/training_plans" and req.method == "DELETE":
        return httpx.Response(200, json=[{"id": PLAN_ID}] if PLAN_ID in str(req.url) else [])
    return httpx.Response(404, json={"message": "nie mock"})


@pytest.fixture
def client():
    seen.clear()
    with TestClient(app) as c:
        app.state.http = httpx.AsyncClient(base_url="https://example.supabase.co", transport=httpx.MockTransport(supabase))
        yield c


AUTH = {"Authorization": f"Bearer {TOKEN}"}
PLAN_BODY = {"name": "  Siła  ", "date": "2026-11-20", "series": 2,
             "rows": [{"exercise_id": EX_ID, "sets": [{"reps": 5, "weight": 100}, {"reps": 3, "weight": 105.5}]},
                      {"exercise_id": None, "sets": [{}, {}]}]}


def test_login_ok_returns_session_and_profile(client):
    r = client.post("/auth/login", json={"email": "JAN@example.com", "password": "dobrehaslo1"})
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"] == TOKEN and body["user"]["first_name"] == "Jan"


def test_login_bad_password_is_401_with_polish_message(client):
    r = client.post("/auth/login", json={"email": "jan@example.com", "password": "zle"})
    assert r.status_code == 401 and r.json()["detail"] == "Nieprawidłowy e-mail lub hasło."


def test_register_needs_confirmation_and_validation(client):
    ok = client.post("/auth/register", json={"email": "jan@example.com", "password": "dobrehaslo1",
                                             "first_name": "Jan", "last_name": "K", "birth_date": "2000-01-02"})
    assert ok.status_code == 201 and ok.json() == {"needs_confirmation": True, "session": None}
    bad = client.post("/auth/register", json={"email": "jan@example.com", "password": "krotkie",
                                              "first_name": "Jan", "last_name": "K", "birth_date": "2000-01-02"})
    assert bad.status_code == 422 and "hasło" in bad.json()["detail"]
    future = client.post("/auth/register", json={"email": "jan@example.com", "password": "dobrehaslo1",
                                                 "first_name": "Jan", "last_name": "K", "birth_date": "2999-01-01"})
    assert future.status_code == 422 and "Data urodzenia" in future.json()["detail"]


def test_endpoints_require_a_valid_token(client):
    assert client.get("/plans").status_code == 401
    assert client.get("/plans", headers={"Authorization": "Bearer zly"}).status_code == 401
    assert client.get("/auth/me", headers=AUTH).json()["last_name"] == "Kowalski"


def test_exercises_list_and_duplicate(client):
    r = client.get("/exercises", headers=AUTH)
    assert r.json() == [{"id": EX_ID, "name": "Martwy ciąg", "category": "Nogi", "own": False}]
    dup = client.post("/exercises", headers=AUTH, json={"name": "Martwy ciąg"})
    assert dup.status_code == 409


def test_plans_list_shapes_sets_and_order(client):
    plan = client.get("/plans", headers=AUTH).json()[0]
    assert plan["date"] == "2026-11-20" and plan["series"] == 3
    first, second = plan["rows"]
    assert first["exercise_name"] == "Martwy ciąg" and second["exercise_name"] is None
    assert first["sets"] == [{"reps": 5, "weight": 100.0}, {"reps": None, "weight": None}, {"reps": 2, "weight": 110.5}]


def test_create_plan_sends_atomic_rpc_payload(client):
    r = client.post("/plans", headers=AUTH, json=PLAN_BODY)
    assert r.status_code == 201 and r.json()["id"] == PLAN_ID
    rpc = next(req for m, p, req in seen if p.endswith("save_training_plan"))
    sent = json.loads(rpc.content)["p_plan"]
    assert sent["id"] is None and sent["name"] == "Siła" and sent["series_count"] == 2
    assert sent["rows"][0]["sets"] == [{"reps": 5, "weight": 100.0}, {"reps": 3, "weight": 105.5}]
    assert rpc.headers["authorization"] == f"Bearer {TOKEN}"  # zapis z uprawnieniami zawodnika (RLS)


def test_update_plan_passes_id(client):
    assert client.put(f"/plans/{PLAN_ID}", headers=AUTH, json=PLAN_BODY).status_code == 200
    rpc = next(req for m, p, req in seen if p.endswith("save_training_plan"))
    assert json.loads(rpc.content)["p_plan"]["id"] == PLAN_ID


def test_plan_validation(client):
    bad = {**PLAN_BODY, "rows": [{"exercise_id": EX_ID, "sets": [{"reps": 1}]}]}
    r = client.post("/plans", headers=AUTH, json=bad)
    assert r.status_code == 422 and "tyle serii" in r.json()["detail"]
    assert client.post("/plans", headers=AUTH, json={**PLAN_BODY, "series": 9}).status_code == 422
    neg = {**PLAN_BODY, "rows": [{"exercise_id": None, "sets": [{"weight": -1}, {}]}]}
    assert client.post("/plans", headers=AUTH, json=neg).status_code == 422


def test_delete_plan(client):
    assert client.delete(f"/plans/{PLAN_ID}", headers=AUTH).status_code == 204
    assert client.delete("/plans/99999999-9999-9999-9999-999999999999", headers=AUTH).status_code == 404
