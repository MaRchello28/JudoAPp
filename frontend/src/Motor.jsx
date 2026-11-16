import { useState } from "react";
import PlanEditor from "./PlanEditor.jsx";
import Compare from "./Compare.jsx";
import {
  getPlans,
  deletePlan,
  newPlan,
  copyPlan,
  planTonnage,
  formatKg,
  formatDate,
} from "./plans.js";

export default function Motor({ user }) {
  const [plans, setPlans] = useState(() => getPlans(user.email));
  const [editing, setEditing] = useState(null);
  const [editorKey, setEditorKey] = useState(0);

  // Każde otwarcie edytora dostaje nowy klucz, dzięki czemu edytor wczytuje świeże dane.
  const open = (plan) => {
    setEditing(plan);
    setEditorKey((k) => k + 1);
  };

  if (editing) {
    return (
      <PlanEditor
        key={editorKey}
        user={user}
        initial={editing}
        onCopy={(plan) => open(copyPlan(plan))}
        onBack={() => {
          setPlans(getPlans(user.email));
          setEditing(null);
        }}
      />
    );
  }

  function remove(plan) {
    if (!window.confirm(`Usunąć plan „${plan.name}”?`)) return;
    deletePlan(user.email, plan.id);
    setPlans(getPlans(user.email));
  }

  return (
    <section className="motorgrid">
      <div>
        <div className="pagehead">
          <h2>Trening motoryczny</h2>
          <button className="btn small" onClick={() => open(newPlan())}>Nowy plan</button>
        </div>

        {plans.length === 0 ? (
          <p className="sub">Nie masz jeszcze żadnego planu. Wybierz „Nowy plan”, aby ułożyć pierwszy.</p>
        ) : (
          <ul className="planlist">
            {plans.map((p) => (
              <li key={p.id}>
                <button className="planopen" onClick={() => open(p)}>
                  <strong>{p.name}</strong>
                  <span>
                    {formatDate(p.date)} · ćwiczeń: {p.rows.length} · serii: {p.series} · tonaż: {formatKg(planTonnage(p))} kg
                  </span>
                </button>
                <button className="btn ghost small" onClick={() => open(copyPlan(p))}>Skopiuj</button>
                <button className="btn ghost small" onClick={() => remove(p)}>Usuń</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Compare plans={plans} />
    </section>
  );
}