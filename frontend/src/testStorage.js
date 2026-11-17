// Wyniki testów zapisane w localStorage, osobno dla każdego użytkownika.
// Docelowo ten plik zamienimy na zapytania do backendu.
const key = (email) => `ippon:tests:${email}`;

export function getTests(email) {
  try {
    return JSON.parse(localStorage.getItem(key(email))) || [];
  } catch {
    return [];
  }
}

function write(email, list) {
  try {
    localStorage.setItem(key(email), JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export function saveTest(email, test) {
  const list = getTests(email);
  const saved = { ...test, id: String(Date.now()) };
  list.unshift(saved);
  if (!write(email, list)) throw new Error("Nie można zapisać wyniku w tej przeglądarce.");
  return saved;
}

export function deleteTest(email, id) {
  write(email, getTests(email).filter((t) => t.id !== id));
}
