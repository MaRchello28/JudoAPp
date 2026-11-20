// Plany treningu motorycznego z backendu (/plans). Zawodnika rozpoznaje backend po tokenie.
import { api } from "./api.js";

const text = (v) => (v == null ? "" : String(v));

// Plan z API -> plan w kształcie używanym przez interfejs (pola formularza jako tekst).
function toPlan(p) {
  return {
    id: p.id,
    name: p.name,
    date: p.date,
    series: p.series,
    rows: p.rows.map((r) => ({
      exercise: r.exercise_name ?? "",
      sets: r.sets.map((s) => ({ reps: text(s.reps), weight: text(s.weight) })),
    })),
  };
}

const toNumber = (v) => {
  const x = parseFloat(String(v).replace(",", "."));
  return String(v).trim() === "" || !Number.isFinite(x) ? null : x;
};
const toReps = (v) => {
  const x = toNumber(v);
  return x === null ? null : Math.round(x);
};

export async function getPlans() {
  return (await api("/plans")).map(toPlan);
}

// idByName: mapa nazwa ćwiczenia -> id (z getExercises). Zwraca zapisany plan z nadanym id.
export async function savePlan(plan, idByName) {
  const body = {
    name: plan.name,
    date: plan.date,
    series: plan.series,
    rows: plan.rows.map((r) => ({
      exercise_id: idByName.get(r.exercise) ?? null,
      sets: r.sets.map((s) => ({ reps: toReps(s.reps), weight: toNumber(s.weight) })),
    })),
  };
  const saved = plan.id
    ? await api(`/plans/${plan.id}`, { method: "PUT", body })
    : await api("/plans", { method: "POST", body });
  return toPlan(saved);
}

export async function deletePlan(id) {
  await api(`/plans/${id}`, { method: "DELETE" });
}
