// Baza ćwiczeń z backendu (GET /exercises): wspólne i własne ćwiczenia zawodnika.
import { api } from "./api.js";

// Zwraca { groups: [{ group, items: [nazwa] }], idByName: Map(nazwa -> id) }.
export async function getExercises() {
  const rows = await api("/exercises");
  const groups = [];
  const idByName = new Map();
  rows.forEach((e) => {
    idByName.set(e.name, e.id);
    let g = groups.find((x) => x.group === e.category);
    if (!g) groups.push((g = { group: e.category, items: [] }));
    g.items.push(e.name);
  });
  return { groups, idByName };
}
