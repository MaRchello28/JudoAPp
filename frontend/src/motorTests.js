// Katalog testów motorycznych: nazwa wiersza i domyślna jednostka.
// Aby dodać test, dopisz go do odpowiedniej grupy. W tabeli można też wpisać własną nazwę.
import { EXERCISES } from "./exercises.js";

export const SJFT = {
  a: "SJFT: rzuty, seria 1 (15 s)",
  b: "SJFT: rzuty, seria 2 (30 s)",
  c: "SJFT: rzuty, seria 3 (30 s)",
  hr0: "SJFT: tętno po teście",
  hr1: "SJFT: tętno po 1 min",
};

export const MOTOR_GROUPS = [
  {
    group: "Wydolność i testy judo",
    items: [
      { name: SJFT.a, unit: "rzuty" },
      { name: SJFT.b, unit: "rzuty" },
      { name: SJFT.c, unit: "rzuty" },
      { name: SJFT.hr0, unit: "uderzeń/min" },
      { name: SJFT.hr1, unit: "uderzeń/min" },
      { name: "Wingate: moc szczytowa", unit: "W" },
      { name: "Wingate: moc średnia", unit: "W" },
      { name: "Wingate: wskaźnik zmęczenia", unit: "%" },
      { name: "VO₂max", unit: "ml/kg/min" },
      { name: "Tętno maksymalne", unit: "uderzeń/min" },
      { name: "Próg tlenowy (LT), tętno", unit: "uderzeń/min" },
      { name: "Próg beztlenowy (AT), tętno", unit: "uderzeń/min" },
      { name: "UFT: liczba wejść", unit: "wejść" },
    ],
  },
  {
    group: "Siła, szybkość i moc",
    items: [
      { name: "CMJ: wysokość skoku", unit: "cm" },
      { name: "SJ: wysokość skoku", unit: "cm" },
      { name: "IMTP: siła szczytowa", unit: "N" },
      { name: "IMTP: tempo rozwijania siły (RFD)", unit: "N/s" },
      { name: "Ścisk dłoni: prawa ręka", unit: "kg" },
      { name: "Ścisk dłoni: lewa ręka", unit: "kg" },
      { name: "Zwis na judodze (czas)", unit: "s" },
      { name: "Podciągnięcia na judodze", unit: "powt." },
      { name: "Prędkość sztangi (VBT)", unit: "m/s" },
      { name: "Sprint 5 m", unit: "s" },
      { name: "Sprint 10 m", unit: "s" },
      { name: "Sprint 20 m", unit: "s" },
    ],
  },
  {
    group: "Maksy siłowe (1RM)",
    items: EXERCISES.flatMap((g) => g.items).map((name) => ({ name, unit: "kg" })),
  },
];

export const UNITS = ["m", "cm", "mm", "kg", "s", "ms", "W", "N", "N/s", "%", "uderzeń/min", "rzuty", "wejść", "powt.", "ml/kg/min", "m/s", "°", "Nm"];

export const ALL_NAMES = MOTOR_GROUPS.flatMap((g) => g.items.map((i) => i.name));
export const UNIT_BY_NAME = new Map(MOTOR_GROUPS.flatMap((g) => g.items.map((i) => [i.name, i.unit])));

// Indeks SJFT liczony automatycznie, gdy w tabeli są wszystkie pięć wierszy SJFT:
// (tętno po teście + tętno po 1 min) / suma rzutów. Niższy oznacza wyższą formę.
const valueOf = (rows, name, col) => {
  const row = rows.find((r) => r.name.trim() === name);
  if (!row) return null;
  const x = parseFloat(String(row.values[col] ?? "").replace(",", "."));
  return Number.isFinite(x) ? x : null;
};

export function sjftIndex(rows, col) {
  const throws = [SJFT.a, SJFT.b, SJFT.c].map((n) => valueOf(rows, n, col));
  const hr0 = valueOf(rows, SJFT.hr0, col);
  const hr1 = valueOf(rows, SJFT.hr1, col);
  if (throws.some((x) => x === null) || hr0 === null || hr1 === null) return null;
  const total = throws[0] + throws[1] + throws[2];
  return total > 0 ? (hr0 + hr1) / total : null;
}
