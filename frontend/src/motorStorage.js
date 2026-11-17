// Jedna tabela testów motorycznych na użytkownika, zapisana w localStorage.
// Wiersze to testy, a kolumny to daty pomiarów.
// Docelowo ten plik zamienimy na zapytania do backendu.
import { todayLocal } from "./plans.js";

export const MAX_COLS = 20;
export const MAX_ROWS = 40;

const key = (email) => `ippon:motortable:${email}`;

export const emptyRow = (cols) => ({ name: "", unit: "", values: Array.from({ length: cols }, () => "") });

export function defaultTable() {
  return { dates: [todayLocal()], rows: Array.from({ length: 6 }, () => emptyRow(1)) };
}

export function getTable(email) {
  try {
    const t = JSON.parse(localStorage.getItem(key(email)));
    if (t && Array.isArray(t.dates) && t.dates.length > 0 && Array.isArray(t.rows) && t.rows.length > 0) {
      return {
        dates: t.dates,
        rows: t.rows.map((r) => ({
          name: r.name ?? "",
          unit: r.unit ?? "",
          values: t.dates.map((_, i) => r.values?.[i] ?? ""),
        })),
      };
    }
  } catch {
    // uszkodzone dane: zaczynamy od pustej tabeli
  }
  return defaultTable();
}

export function saveTable(email, table) {
  try {
    localStorage.setItem(key(email), JSON.stringify(table));
    return true;
  } catch {
    return false;
  }
}