// Wersja demo: konta w localStorage. Docelowo zastąpimy to prawdziwym backendem.
const USERS = "ippon:users";
const SESSION = "ippon:session";

const read = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k));
  } catch {
    return null;
  }
};
const write = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
};

async function hash(text) {
  const bytes = new TextEncoder().encode("ippon|" + text);
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Dane użytkownika bez hasła, w jednym kształcie w całej aplikacji.
// Starsze konta (sprzed dodania imienia i nazwiska) mają tylko pole "name".
function publicUser(email, u) {
  return {
    email,
    firstName: u.firstName || u.name || "",
    lastName: u.lastName || "",
    birthDate: u.birthDate || "",
  };
}

export function getSession() {
  const s = read(SESSION);
  const users = read(USERS) || {};
  return s && users[s.email] ? publicUser(s.email, users[s.email]) : null;
}

export async function register({ email, firstName, lastName, birthDate, password }) {
  const users = read(USERS) || {};
  if (users[email]) throw new Error("Konto z tym adresem już istnieje. Zaloguj się.");
  users[email] = { firstName, lastName, birthDate, hash: await hash(password) };
  if (!write(USERS, users)) throw new Error("Nie można zapisać konta w tej przeglądarce.");
  write(SESSION, { email });
  return publicUser(email, users[email]);
}

export async function login({ email, password }) {
  const user = (read(USERS) || {})[email];
  if (!user || user.hash !== (await hash(password))) {
    throw new Error("Nieprawidłowy e-mail lub hasło.");
  }
  write(SESSION, { email });
  return publicUser(email, user);
}

export function logout() {
  try {
    localStorage.removeItem(SESSION);
  } catch {}
}