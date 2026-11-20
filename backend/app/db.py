"""Komunikacja z Supabase (Auth i PostgREST) przez httpx.

Backend nie używa tajnego klucza: do bazy wysyła token zalogowanego zawodnika,
więc zabezpieczenia RLS w bazie nadal decydują, kto co widzi.
"""
from typing import Annotated

import httpx
from fastapi import Depends, HTTPException, Request

from .config import settings


def get_http(request: Request) -> httpx.AsyncClient:
    return request.app.state.http


Http = Annotated[httpx.AsyncClient, Depends(get_http)]


def api_headers(token: str | None = None, extra: dict | None = None) -> dict:
    headers = {"apikey": settings.supabase_publishable_key}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if extra:
        headers.update(extra)
    return headers


async def send(http: httpx.AsyncClient, method: str, url: str, *, token: str | None = None,
               headers: dict | None = None, **kwargs) -> httpx.Response:
    try:
        return await http.request(method, url, headers=api_headers(token, headers), **kwargs)
    except httpx.RequestError as exc:
        raise HTTPException(502, "Nie można połączyć się z bazą danych. Spróbuj ponownie za chwilę.") from exc


AUTH_RULES = {
    "invalid_credentials": (401, "Nieprawidłowy e-mail lub hasło."),
    "email_not_confirmed": (403, "Potwierdź adres e-mail (sprawdź skrzynkę), a potem się zaloguj."),
    "user_already_exists": (409, "Konto z tym adresem już istnieje. Zaloguj się."),
    "email_exists": (409, "Konto z tym adresem już istnieje. Zaloguj się."),
    "weak_password": (422, "Hasło jest zbyt słabe. Użyj dłuższego, trudniejszego hasła."),
    "over_request_rate_limit": (429, "Zbyt wiele prób. Spróbuj ponownie za chwilę."),
    "over_email_send_rate_limit": (429, "Wysłano zbyt wiele e-maili. Spróbuj ponownie za chwilę."),
    "signup_disabled": (403, "Rejestracja nowych kont jest wyłączona."),
    "refresh_token_not_found": (401, "Sesja wygasła. Zaloguj się ponownie."),
    "refresh_token_already_used": (401, "Sesja wygasła. Zaloguj się ponownie."),
    "session_not_found": (401, "Sesja wygasła. Zaloguj się ponownie."),
}


def auth_error(resp: httpx.Response) -> HTTPException:
    """Zamienia błąd z Supabase Auth na odpowiedź API z polskim komunikatem."""
    try:
        body = resp.json()
    except ValueError:
        body = {}
    code = body.get("error_code") if isinstance(body, dict) else None
    text = ""
    if isinstance(body, dict):
        text = body.get("msg") or body.get("message") or body.get("error_description") or ""
    if not isinstance(code, str) and "invalid login credentials" in text.lower():
        code = "invalid_credentials"
    if code in AUTH_RULES:
        status, message = AUTH_RULES[code]
        return HTTPException(status, message)
    if 400 <= resp.status_code < 500:
        return HTTPException(400, text or "Nieprawidłowe żądanie.")
    return HTTPException(502, "Usługa logowania jest chwilowo niedostępna.")


def rest_error(resp: httpx.Response) -> HTTPException:
    """Zamienia błąd z bazy (PostgREST) na odpowiedź API."""
    try:
        body = resp.json()
    except ValueError:
        body = {}
    code = str(body.get("code", "")) if isinstance(body, dict) else ""
    message = (body.get("message") if isinstance(body, dict) else None) or resp.text or ""
    if resp.status_code == 401 or code.startswith("PGRST30"):
        return HTTPException(401, "Sesja wygasła. Zaloguj się ponownie.")
    if code == "42501" or resp.status_code == 403:
        return HTTPException(403, "Brak dostępu do tych danych.")
    if code == "23505":
        return HTTPException(409, "Taki rekord już istnieje.")
    if code == "23503":
        return HTTPException(409, "Powiązany rekord nie istnieje albo jest w użyciu.")
    if code == "P0001":
        return HTTPException(404 if "nie istnieje" in message else 400, message)
    if 400 <= resp.status_code < 500:
        return HTTPException(400, message or "Nieprawidłowe żądanie.")
    return HTTPException(502, "Baza danych jest chwilowo niedostępna.")


def ensure_ok(resp: httpx.Response) -> httpx.Response:
    if not resp.is_success:
        raise rest_error(resp)
    return resp
