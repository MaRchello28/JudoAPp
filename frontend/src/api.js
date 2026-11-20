// Klient API: rozmowa z backendem w Pythonie (FastAPI) i obsługa sesji.
// Adres backendu pochodzi ze zmiennej VITE_API_URL w pliku .env (folder frontend).
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
const KEY = "ippon:session";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}
export function storeSession(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token }));
  } catch {
    // brak dostępu do pamięci przeglądarki: sesja potrwa tylko do odświeżenia strony
  }
}
export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nic do zrobienia
  }
}

// Zapytanie bez automatycznego odświeżania sesji (logowanie, rejestracja, odświeżanie).
export async function publicApi(path, { method = "GET", body, token } = {}) {
  let res;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Brak połączenia z serwerem. Sprawdź, czy backend działa.", 0);
  }
  let data = null;
  if (res.status !== 204) {
    try {
      data = await res.json();
    } catch {
      // odpowiedź bez treści JSON
    }
  }
  if (!res.ok) {
    throw new ApiError(typeof data?.detail === "string" ? data.detail : "Coś poszło nie tak. Spróbuj ponownie.", res.status);
  }
  return data;
}

// Odświeżenie wygasłego tokenu. Równoległe zapytania czekają na jedno odświeżenie.
let refreshing = null;
function refresh() {
  if (!refreshing) {
    refreshing = (async () => {
      const s = getStoredSession();
      if (!s?.refresh_token) return false;
      try {
        storeSession(await publicApi("/auth/refresh", { method: "POST", body: { refresh_token: s.refresh_token } }));
        return true;
      } catch {
        clearSession();
        return false;
      }
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

// Zapytanie jako zalogowany zawodnik: dokłada token i przy 401 jeden raz odświeża sesję.
export async function api(path, options = {}) {
  const s = getStoredSession();
  try {
    return await publicApi(path, { ...options, token: s?.access_token });
  } catch (err) {
    if (err.status === 401 && s?.refresh_token && (await refresh())) {
      return publicApi(path, { ...options, token: getStoredSession().access_token });
    }
    throw err;
  }
}
