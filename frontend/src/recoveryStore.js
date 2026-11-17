// Regeneracja: dzienne wpisy (HRV, tętno spoczynkowe, sen) zapisane w localStorage.
// Każdy wpis ma pole source ("manual"), żeby później odróżnić dane z zegarków (Garmin, Whoop, Oura, Apple Health).
// Docelowo ten plik zamienimy na zapytania do backendu.
import { keyOf, parseKey } from "./calendarStore.js";

// Progi ostrzeżeń są orientacyjne. Tu możesz je zmienić.
export const HRV_BASE_DAYS = 7; // średnia z ostatnich 7 dni
export const HRV_WARN = 10; // spadek HRV w % względem średniej: lekki
export const HRV_ALERT = 20; // spadek HRV w % względem średniej: duży
export const RHR_BASE_DAYS = 14; // norma zawodnika: średnia z ostatnich 14 dni
export const RHR_WARN = 5; // wzrost tętna spoczynkowego w uderzeniach/min: podwyższone
export const RHR_ALERT = 10; // wyraźnie podwyższone
const MIN_POINTS = 3; // tyle pomiarów potrzeba, żeby policzyć średnią

const storageKey = (email) => `ippon:recovery:${email}`;

const byDate = (a, b) => a.date.localeCompare(b.date);

export function getEntries(email) {
  try {
    const list = JSON.parse(localStorage.getItem(storageKey(email)));
    if (Array.isArray(list)) return list.filter((e) => e && typeof e.date === "string").sort(byDate);
  } catch {
    // uszkodzone dane: zaczynamy od pustej listy
  }
  return [];
}

function write(email, list) {
  try {
    localStorage.setItem(storageKey(email), JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

// Jeden wpis na dzień: zapis z tą samą datą zastępuje poprzedni.
export function saveEntry(email, entry) {
  const list = getEntries(email).filter((e) => e.date !== entry.date);
  list.push(entry);
  list.sort(byDate);
  if (!write(email, list)) throw new Error("Nie można zapisać wpisu w tej przeglądarce.");
  return list;
}

export function deleteEntry(email, date) {
  const list = getEntries(email).filter((e) => e.date !== date);
  write(email, list);
  return list;
}

export const addDays = (dateKey, n) => keyOf(new Date(parseKey(dateKey).getTime() + n * 86400000));

const mean = (list) => list.reduce((a, b) => a + b, 0) / list.length;

// Średnia z `days` dni poprzedzających datę (sam dzień nie wchodzi do średniej).
export function baseline(entries, date, field, days) {
  const from = addDays(date, -days);
  const values = entries.filter((e) => e.date >= from && e.date < date && e[field] != null).map((e) => e[field]);
  return values.length >= MIN_POINTS ? mean(values) : null;
}

// Ocena wpisu: poziom "ok" | "warn" | "alert" albo "none", gdy brak pomiaru lub za mało danych do średniej.
export function assess(entries, entry) {
  const hrvBase = entry.hrv != null ? baseline(entries, entry.date, "hrv", HRV_BASE_DAYS) : null;
  const rhrBase = entry.rhr != null ? baseline(entries, entry.date, "rhr", RHR_BASE_DAYS) : null;

  const hrv = { base: hrvBase, changePct: null, level: "none" };
  if (hrvBase !== null) {
    hrv.changePct = ((entry.hrv - hrvBase) / hrvBase) * 100;
    hrv.level = hrv.changePct <= -HRV_ALERT ? "alert" : hrv.changePct <= -HRV_WARN ? "warn" : "ok";
  }

  const rhr = { base: rhrBase, diff: null, level: "none" };
  if (rhrBase !== null) {
    rhr.diff = entry.rhr - rhrBase;
    rhr.level = rhr.diff >= RHR_ALERT ? "alert" : rhr.diff >= RHR_WARN ? "warn" : "ok";
  }
  return { hrv, rhr };
}
