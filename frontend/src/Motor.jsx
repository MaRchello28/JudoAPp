import { useEffect, useState } from "react";
import PlanEditor from "./PlanEditor.jsx";
import Compare from "./Compare.jsx";
import { newPlan, copyPlan, planTonnage, formatKg, formatDate } from "./plans.js";
import { getPlans, deletePlan } from "./plansApi.js";
import { getExercises } from "./exercisesApi.js";

export default function Motor() {
  const [plans, setPlans] = useState([]);
  const [exercises, setExercises] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [editorKey, setEditorKey] = useState(0);

  async function reload() {
    try {
      setPlans(await getPlans());
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  // Przy wejściu w zakładkę pobieramy plany i bazę ćwiczeń z backendu.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, ex] = await Promise.all([getPlans(), getExercises()]);
        if (!cancelled) {
          setPlans(p);
          setExercises(ex);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Każde otwarcie edytora dostaje nowy klucz, dzięki czemu edytor wczytuje świeże dane.
  const open = (plan) => {
    setEditing(plan);
    setEditorKey((k) => k + 1);
  };

  if (loading) return <p className="sub">Ładowanie planów…</p>;

  if (!exercises) {
    return (
      <section>
        <h2>Trening motoryczny</h2>
        <p className="err" role="alert">Nie udało się pobrać danych z bazy: {error}</p>
      </section>
    );
  }

  if (editing) {
    return (
      <PlanEditor
        key={editorKey}
        initial={editing}
        exercises={exercises}
        onCopy={(plan) => open(copyPlan(plan))}
        onBack={async () => {
          await reload();
          setEditing(null);
        }}
      />
    );
  }

  async function remove(plan) {
    if (!window.confirm(`Usunąć plan „${plan.name}”?`)) return;
    try {
      await deletePlan(plan.id);
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="motorgrid">
      <div>
        <div className="pagehead">
          <h2>Trening motoryczny</h2>
          <button className="btn small" onClick={() => open(newPlan())}>Nowy plan</button>
        </div>
        {error && <p className="err" role="alert">{error}</p>}

        {plans.length === 0 ? (
          <p className="sub">Nie masz jeszcze żadnego planu. Wybierz „Nowy plan”, aby ułożyć pierwszy.</p>
        ) : (
          <ul className="planlist">
            {plans.map((p) => (
              <li key={p.id}>
                <button className="planopen" onClick={() => open(p)}>
                  <strong>{p.name}</strong>
                  <span>
                    {formatDate(p.date)} · ćwiczeń: {p.rows.filter((r) => r.exercise).length} · serii: {p.series} · tonaż: {formatKg(planTonnage(p))} kg
                  </span>
                </button>
                <button className="btn ghost small" onClick={() => open(copyPlan(p))}>Skopiuj</button>
                <button className="btn ghost small" onClick={() => remove(p)}>Usuń</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Compare plans={plans} groups={exercises.groups} />
    </section>
  );
}
