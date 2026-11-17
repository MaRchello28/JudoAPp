// Kalendarz: aktywności w poszczególne dni i lista zawodów, zapisane w localStorage.
// Docelowo ten plik zamienimy na zapytania do backendu.

export const ACTIVITY_TYPES = [
  { id: "heavy", label: "Trening siłowy mocny", short: "Siła mocna" },
  { id: "light", label: "Trening siłowy luźny", short: "Siła luźna" },
  { id: "cardio", label: "Trening kondycyjny", short: "Kondycja" },
  { id: "competition", label: "Dzień zawodów", short: "Zawody" },
  // Dodatkowe propozycje
  { id: "mat", label: "Trening judo na macie", short: "Judo (mata)", extra: true },
  { id: "recovery", label: "Regeneracja aktywna", short: "Regeneracja", extra: true },
  { id: "injury", label: "Choroba lub kontuzja", short: "Kontuzja", extra: true },
];

export const COMPETITION_STATUSES = [
  { id: "interested", label: "Interesuje mnie" },
  { id: "registered", label: "Zgłoszony" },
];

export const MONTHS = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];
export const WEEKDAYS_SHORT = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
export const WEEKDAYS_LONG = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];

// Odpoczynek to dzień bez żadnej aktywności (puste pole), więc nie ma własnego typu na liście.
export const REST = { id: "rest", label: "Odpoczynek", short: "Odpoczynek" };
export const typeById = (id) => ACTIVITY_TYPES.find((t) => t.id === id) || REST;

// W jednym dniu może być do trzech aktywności.
export const MAX_ACTIVITIES = 3;
const ORDER = ACTIVITY_TYPES.map((t) => t.id);
export const sortTypes = (types) => [...types].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));

const pad = (n) => String(n).padStart(2, "0");
export const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseKey = (k) => new Date(k + "T12:00:00");
export const daysUntil = (dateKey, fromKey) => Math.round((parseKey(dateKey) - parseKey(fromKey)) / 86400000);

// Komórki miesiąca, tydzień zaczyna się w poniedziałek; zawiera też dni sąsiednich miesięcy.
export function monthCells(year, month) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const dim = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((offset + dim) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(year, month, 1 - offset + i);
    return { key: keyOf(d), day: d.getDate(), inMonth: d.getMonth() === month };
  });
}

const storageKey = (email) => `ippon:calendar:${email}`;

// Dni zapisane w starym formacie ({ type }) zamieniamy na { types: [...] }, a odpoczynek na pustą listę.
function normalizeDays(raw) {
  const days = {};
  Object.entries(raw && typeof raw === "object" ? raw : {}).forEach(([date, entry]) => {
    const list = Array.isArray(entry?.types) ? entry.types : entry?.type ? [entry.type] : [];
    const types = sortTypes([...new Set(list)].filter((id) => ORDER.includes(id))).slice(0, MAX_ACTIVITIES);
    const note = typeof entry?.note === "string" ? entry.note : "";
    if (types.length || note) days[date] = { types, note };
  });
  return days;
}

export function getCalendar(email) {
  try {
    const c = JSON.parse(localStorage.getItem(storageKey(email)));
    if (c && typeof c === "object") {
      return {
        days: normalizeDays(c.days),
        competitions: Array.isArray(c.competitions) ? c.competitions : [],
      };
    }
  } catch {
    // uszkodzone dane: zaczynamy od pustego kalendarza
  }
  return { days: {}, competitions: [] };
}

export function saveCalendar(email, cal) {
  try {
    localStorage.setItem(storageKey(email), JSON.stringify(cal));
    return true;
  } catch {
    return false;
  }
}