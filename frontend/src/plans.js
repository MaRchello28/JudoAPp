// Plany treningowe zapisane w localStorage, osobno dla każdego użytkownika.
// Docelowo ten plik zamienimy na zapytania do backendu.
export const MAX_SERIES = 8;
export const MAX_EXERCISES = 15;

const key = (email) => `ippon:plans:${email}`;

function read(email) {
  try {
    return JSON.parse(localStorage.getItem(key(email))) || [];
  } catch {
    return [];
  }
}
function write(email, plans) {
  try {
    localStorage.setItem(key(email), JSON.stringify(plans));
    return true;
  } catch {
    return false;
  }
}

export const todayLocal = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

export const emptySets = (n) => Array.from({ length: n }, () => ({ reps: "", weight: "" }));
export const emptyRow = (n) => ({ exercise: "", sets: emptySets(n) });

export function newPlan() {
  return {
    id: null,
    name: "",
    date: todayLocal(),
    series: 3,
    rows: Array.from({ length: 4 }, () => emptyRow(3)),
  };
}

// Obliczenia: tonaż ćwiczenia = suma (powtórzenia × obciążenie) po seriach.
const num = (v) => {
  const x = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(x) ? x : 0;
};
export const rowTonnage = (row) => row.sets.reduce((sum, s) => sum + num(s.reps) * num(s.weight), 0);
export const planTonnage = (plan) => plan.rows.reduce((sum, r) => sum + rowTonnage(r), 0);
export const formatKg = (n) => n.toLocaleString("pl-PL", { maximumFractionDigits: 2 });

export function getPlans(email) {
  return read(email);
}

export function savePlan(email, plan) {
  const plans = read(email);
  const saved = { ...plan, id: plan.id || String(Date.now()) };
  const i = plans.findIndex((p) => p.id === saved.id);
  if (i >= 0) plans[i] = saved;
  else plans.unshift(saved);
  if (!write(email, plans)) throw new Error("Nie można zapisać planu w tej przeglądarce.");
  return saved;
}

export function deletePlan(email, id) {
  write(email, read(email).filter((p) => p.id !== id));
}

export const formatDate = (d) => (d ? d.split("-").reverse().join(".") : "–");

// Kopia planu: te same ćwiczenia, serie, powtórzenia i obciążenia, z dzisiejszą datą.
export function copyPlan(plan) {
  const copy = JSON.parse(JSON.stringify(plan));
  return { ...copy, id: null, name: `${plan.name} (kopia)`, date: todayLocal() };
}

// Historia jednego ćwiczenia: do `limit` ostatnich zapisanych treningów, od najnowszego.
export function exerciseHistory(plans, exercise, limit = 3) {
  return plans
    .map((plan) => ({
      plan,
      sets: plan.rows
        .filter((r) => r.exercise === exercise)
        .flatMap((r) => r.sets)
        .filter((s) => s.reps !== "" || s.weight !== ""),
    }))
    .filter((x) => x.sets.length > 0)
    .sort((a, b) => b.plan.date.localeCompare(a.plan.date) || b.plan.id.localeCompare(a.plan.id))
    .slice(0, limit)
    .map(({ plan, sets }) => ({
      id: plan.id,
      name: plan.name,
      date: plan.date,
      sets,
      max: Math.max(...sets.map((s) => num(s.weight))),
      tonnage: sets.reduce((t, s) => t + num(s.reps) * num(s.weight), 0),
    }));
}