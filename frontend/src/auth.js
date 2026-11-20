// Konta i sesja przez backend (Python), który korzysta z Supabase Auth.
import { api, publicApi, getStoredSession, storeSession, clearSession } from "./api.js";

// Użytkownik w kształcie, którego używa cała aplikacja.
const toUser = (u) => ({
  id: u.id,
  email: u.email,
  firstName: u.first_name,
  lastName: u.last_name,
  birthDate: u.birth_date || "",
});

export async function getCurrentUser() {
  if (!getStoredSession()) return null;
  try {
    return toUser(await api("/auth/me"));
  } catch (err) {
    if (err.status === 401) {
      clearSession();
      return null;
    }
    throw err;
  }
}

// Zwraca { user } albo { needsConfirmation: true }, gdy projekt wymaga potwierdzenia e-maila.
export async function register({ email, password, firstName, lastName, birthDate }) {
  const res = await publicApi("/auth/register", {
    method: "POST",
    body: { email, password, first_name: firstName, last_name: lastName, birth_date: birthDate },
  });
  if (res.needs_confirmation) return { needsConfirmation: true };
  storeSession(res.session);
  return { user: toUser(res.session.user) };
}

export async function login({ email, password }) {
  const session = await publicApi("/auth/login", { method: "POST", body: { email, password } });
  storeSession(session);
  return toUser(session.user);
}

export async function logout() {
  const s = getStoredSession();
  clearSession();
  if (s) {
    try {
      await publicApi("/auth/logout", { method: "POST", token: s.access_token });
    } catch {
      // wylogowanie lokalne już się odbyło
    }
  }
}
