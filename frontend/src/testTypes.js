// Definicje rodzajów testów. Aby dodać nowy test, dopisz obiekt do TEST_TYPES.
// Typy pól: "number" (liczba), "scale" (skala 1–10), "exercise" (ćwiczenie z bazy), "text".

const n = (v) => {
  const x = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(x) ? x : null;
};
const nums = (values, keys) => keys.map((k) => n(values[k])).filter((x) => x !== null);
const avg = (list) => list.reduce((a, b) => a + b, 0) / list.length;
const fmt = (x, d = 1) => x.toLocaleString("pl-PL", { maximumFractionDigits: d });

export const CATEGORIES = ["Szybkość i reakcja", "Siła", "Wydolność judo", "Psychologiczne", "Inne"];

const REACTION_KEYS = ["t1", "t2", "t3", "t4", "t5"];
const JUMP_KEYS = ["j1", "j2", "j3"];

export const TEST_TYPES = [
  {
    id: "reaction",
    category: "Szybkość i reakcja",
    name: "Czas reakcji",
    short: "Wyniki z kilku prób w milisekundach.",
    description: "Wpisz czasy reakcji z kolejnych prób (np. test linijki albo aplikacja). Niższy czas oznacza lepszy wynik.",
    fields: REACTION_KEYS.map((key, i) => ({ key, label: `Próba ${i + 1}`, type: "number", unit: "ms", min: 0 })),
    summary: (v) => {
      const t = nums(v, REACTION_KEYS);
      return t.length ? `Średnia ${fmt(avg(t))} ms, najlepsza ${fmt(Math.min(...t))} ms` : "";
    },
  },
  {
    id: "jump",
    category: "Szybkość i reakcja",
    name: "Skok pionowy",
    short: "Wysokość skoku z miejsca, trzy próby.",
    description: "Wysokość skoku pionowego z miejsca w centymetrach.",
    fields: JUMP_KEYS.map((key, i) => ({ key, label: `Próba ${i + 1}`, type: "number", unit: "cm", min: 0 })),
    summary: (v) => {
      const t = nums(v, JUMP_KEYS);
      return t.length ? `Najlepszy skok: ${fmt(Math.max(...t))} cm` : "";
    },
  },
  {
    id: "max",
    category: "Siła",
    name: "Maks siłowy",
    short: "Największe obciążenie w wybranym ćwiczeniu.",
    description: "Najwyższe obciążenie, jakie podniosłeś w danym ćwiczeniu. Przy jednym powtórzeniu zostaw 1.",
    fields: [
      { key: "exercise", label: "Ćwiczenie", type: "exercise", required: true },
      { key: "weight", label: "Obciążenie", type: "number", unit: "kg", min: 0, required: true },
      { key: "reps", label: "Powtórzenia", type: "number", min: 1, step: 1, default: "1" },
    ],
    summary: (v) => {
      const w = n(v.weight);
      if (w === null) return "";
      const reps = n(v.reps);
      return `${v.exercise ? v.exercise + ": " : ""}${fmt(w, 2)} kg${reps > 1 ? ` × ${fmt(reps, 0)}` : ""}`;
    },
  },
  {
    id: "grip",
    category: "Siła",
    name: "Siła chwytu",
    short: "Pomiar dynamometrem, prawa i lewa ręka.",
    description: "Siła chwytu zmierzona dynamometrem, osobno dla każdej ręki.",
    fields: [
      { key: "right", label: "Prawa ręka", type: "number", unit: "kg", min: 0 },
      { key: "left", label: "Lewa ręka", type: "number", unit: "kg", min: 0 },
    ],
    summary: (v) => {
      const parts = [];
      if (n(v.right) !== null) parts.push(`prawa ${fmt(n(v.right))} kg`);
      if (n(v.left) !== null) parts.push(`lewa ${fmt(n(v.left))} kg`);
      return parts.join(", ");
    },
  },
  {
    id: "sjft",
    category: "Wydolność judo",
    name: "Special Judo Fitness Test",
    short: "Rzuty w seriach 15 s, 30 s i 30 s oraz tętno.",
    description:
      "Trzy serie rzutów (15 s, 30 s, 30 s) z 10-sekundowymi przerwami. Wpisz liczbę rzutów i tętno tuż po teście oraz po 1 minucie. Indeks = suma tętna / liczba rzutów, a niższy oznacza lepszą wydolność.",
    fields: [
      { key: "a", label: "Seria 1 (15 s), rzuty", type: "number", min: 0, step: 1 },
      { key: "b", label: "Seria 2 (30 s), rzuty", type: "number", min: 0, step: 1 },
      { key: "c", label: "Seria 3 (30 s), rzuty", type: "number", min: 0, step: 1 },
      { key: "hr0", label: "Tętno tuż po teście", type: "number", unit: "uderzeń/min", min: 0, step: 1 },
      { key: "hr1", label: "Tętno po 1 minucie", type: "number", unit: "uderzeń/min", min: 0, step: 1 },
    ],
    summary: (v) => {
      const total = nums(v, ["a", "b", "c"]).reduce((a, b) => a + b, 0);
      const hr0 = n(v.hr0);
      const hr1 = n(v.hr1);
      const parts = [];
      if (total > 0) parts.push(`rzuty: ${fmt(total, 0)}`);
      if (total > 0 && hr0 !== null && hr1 !== null) parts.push(`indeks: ${fmt((hr0 + hr1) / total, 2)}`);
      return parts.join(", ");
    },
  },
  {
    id: "readiness",
    category: "Psychologiczne",
    name: "Gotowość psychiczna",
    short: "Samoocena w skali 1–10 przed treningiem lub walką.",
    description: "Oceń swój stan psychiczny w skali od 1 do 10.",
    fields: [
      { key: "confidence", label: "Pewność siebie", type: "scale" },
      { key: "motivation", label: "Motywacja", type: "scale" },
      { key: "focus", label: "Koncentracja", type: "scale" },
      { key: "stress", label: "Poziom stresu", type: "scale", hint: "1 = brak stresu, 10 = bardzo duży stres" },
    ],
    summary: (v) => {
      const pos = nums(v, ["confidence", "motivation", "focus"]);
      const stress = n(v.stress);
      const parts = [];
      if (pos.length) parts.push(`gotowość ${fmt(avg(pos))}/10`);
      if (stress !== null) parts.push(`stres ${fmt(stress, 0)}/10`);
      return parts.join(", ");
    },
  },
  {
    id: "custom",
    category: "Inne",
    name: "Własny test",
    short: "Wpisz nazwę, wynik i jednostkę.",
    description: "Dowolny test, którego nie ma na liście.",
    fields: [
      { key: "name", label: "Nazwa testu", type: "text", required: true },
      { key: "value", label: "Wynik", type: "number", required: true },
      { key: "unit", label: "Jednostka", type: "text" },
    ],
    summary: (v) => {
      const x = n(v.value);
      return x === null ? "" : `${v.name ? v.name + ": " : ""}${fmt(x, 2)}${v.unit ? " " + v.unit : ""}`;
    },
  },
];

export const getType = (id) => TEST_TYPES.find((t) => t.id === id);
export const summarize = (type, values) => (type.summary ? type.summary(values) : "");

export function fieldDisplay(field, value) {
  if (field.type === "number") {
    const x = n(value);
    return x === null ? String(value) : `${fmt(x, 2)}${field.unit ? " " + field.unit : ""}`;
  }
  if (field.type === "scale") return `${value}/10`;
  return String(value);
}
