import { Fragment, useState } from "react";
import { EXERCISES } from "./exercises.js";
import {
  MAX_SERIES,
  MAX_EXERCISES,
  emptyRow,
  rowTonnage,
  planTonnage,
  formatKg,
  savePlan,
} from "./plans.js";

const DAYS = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
const filled = (s) => s.reps !== "" || s.weight !== "";

export default function PlanEditor({ user, initial, onBack, onCopy }) {
  const [plan, setPlan] = useState(initial);
  const [status, setStatus] = useState("");

  const update = (patch) => {
    setPlan((p) => ({ ...p, ...patch }));
    setStatus("");
  };

  const setExercise = (r, value) =>
    update({ rows: plan.rows.map((row, i) => (i === r ? { ...row, exercise: value } : row)) });

  const setCell = (r, s, field, value) =>
    update({
      rows: plan.rows.map((row, i) =>
        i !== r
          ? row
          : { ...row, sets: row.sets.map((x, j) => (j === s ? { ...x, [field]: value } : x)) }
      ),
    });

  function addSeries() {
    if (plan.series >= MAX_SERIES) return;
    update({
      series: plan.series + 1,
      rows: plan.rows.map((r) => ({ ...r, sets: [...r.sets, { reps: "", weight: "" }] })),
    });
  }

  function removeSeries() {
    if (plan.series <= 1) return;
    const hasData = plan.rows.some((r) => filled(r.sets[plan.series - 1]));
    if (hasData && !window.confirm("Ostatnia seria zawiera dane. Na pewno ją usunąć?")) return;
    update({
      series: plan.series - 1,
      rows: plan.rows.map((r) => ({ ...r, sets: r.sets.slice(0, -1) })),
    });
  }

  function addExercise() {
    if (plan.rows.length >= MAX_EXERCISES) return;
    update({ rows: [...plan.rows, emptyRow(plan.series)] });
  }

  function removeExercise() {
    if (plan.rows.length <= 1) return;
    const last = plan.rows[plan.rows.length - 1];
    const hasData = last.exercise || last.sets.some(filled);
    if (hasData && !window.confirm("Ostatnie ćwiczenie zawiera dane. Na pewno je usunąć?")) return;
    update({ rows: plan.rows.slice(0, -1) });
  }

  function handleSave() {
    try {
      const name = plan.name.trim() || `Plan z ${plan.date}`;
      setPlan(savePlan(user.email, { ...plan, name }));
      setStatus("Plan zapisany.");
    } catch (err) {
      setStatus(err.message);
    }
  }

  const day = plan.date ? DAYS[new Date(plan.date + "T12:00:00").getDay()] : "";

  return (
    <section>
      <div className="pagehead">
        <h2>{plan.id ? "Edycja planu" : "Nowy plan treningowy"}</h2>
        <button className="btn ghost small" onClick={onBack}>Wróć do planów</button>
      </div>

      <div className="meta">
        <div>
          <label htmlFor="planName">Nazwa planu</label>
          <input id="planName" value={plan.name} onChange={(e) => update({ name: e.target.value })} placeholder="np. Siła, tydzień 1" />
        </div>
        <div>
          <label htmlFor="planDate">Data</label>
          <input id="planDate" type="date" value={plan.date} onChange={(e) => update({ date: e.target.value })} />
        </div>
        <div>
          <label>Dzień tygodnia</label>
          <p className="day">{day || "–"}</p>
        </div>
      </div>

      <div className="tablewrap">
        <table className="plan">
          <thead>
            <tr>
              <th rowSpan={2}>Ćwiczenie</th>
              {Array.from({ length: plan.series }, (_, i) => (
                <th key={i} colSpan={2}>Seria {i + 1}</th>
              ))}
              <th rowSpan={2}>Tonaż (kg)</th>
            </tr>
            <tr>
              {Array.from({ length: plan.series }, (_, i) => (
                <Fragment key={i}>
                  <th>Powtórzenia</th>
                  <th>Obciążenie (kg)</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {plan.rows.map((row, r) => (
              <tr key={r}>
                <td className="ex">
                  <select
                    value={row.exercise}
                    onChange={(e) => setExercise(r, e.target.value)}
                    aria-label={`Ćwiczenie ${r + 1}`}
                  >
                    <option value="">Wybierz ćwiczenie</option>
                    {EXERCISES.map((g) => (
                      <optgroup key={g.group} label={g.group}>
                        {g.items.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </td>
                {row.sets.map((s, i) => (
                  <Fragment key={i}>
                    <td>
                      <input
                        type="number" min="0" step="1" inputMode="numeric"
                        value={s.reps}
                        onChange={(e) => setCell(r, i, "reps", e.target.value)}
                        aria-label={`Ćwiczenie ${r + 1}, seria ${i + 1}, powtórzenia`}
                      />
                    </td>
                    <td>
                      <input
                        type="number" min="0" step="any" inputMode="decimal"
                        value={s.weight}
                        onChange={(e) => setCell(r, i, "weight", e.target.value)}
                        aria-label={`Ćwiczenie ${r + 1}, seria ${i + 1}, obciążenie`}
                      />
                    </td>
                  </Fragment>
                ))}
                <td className="ton">{formatKg(rowTonnage(row))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={plan.series * 2 + 1}>Suma:</td>
              <td className="ton">{formatKg(planTonnage(plan))}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="toolbar">
        <div className="group">
          <span>Serie: {plan.series}</span>
          <button className="btn ghost small" onClick={removeSeries} disabled={plan.series <= 1}>Usuń serię</button>
          <button className="btn ghost small" onClick={addSeries} disabled={plan.series >= MAX_SERIES}>Dodaj serię</button>
        </div>
        <div className="group">
          <span>Ćwiczenia: {plan.rows.length}</span>
          <button className="btn ghost small" onClick={removeExercise} disabled={plan.rows.length <= 1}>Usuń ćwiczenie</button>
          <button className="btn ghost small" onClick={addExercise} disabled={plan.rows.length >= MAX_EXERCISES}>Dodaj ćwiczenie</button>
        </div>
      </div>

      <div className="toolbar">
        <button className="btn small" onClick={handleSave}>Zapisz plan</button>
        {plan.id && (
          <button className="btn ghost small" onClick={() => onCopy(plan)}>Skopiuj plan</button>
        )}
        <span className="status" role="status">{status}</span>
      </div>
    </section>
  );
}