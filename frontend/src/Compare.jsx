import { useState } from "react";
import { exerciseHistory, formatDate } from "./plans.js";

export default function Compare({ plans, groups }) {
  const [exercise, setExercise] = useState("");
  const history = exercise ? exerciseHistory(plans, exercise, 3) : [];

  return (
    <aside className="compare">
      <h3>Porównywarka obciążeń</h3>
      <label htmlFor="cmpExercise">Ćwiczenie</label>
      <select id="cmpExercise" value={exercise} onChange={(e) => setExercise(e.target.value)}>
        <option value="">Wybierz ćwiczenie</option>
        {groups.map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.items.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </optgroup>
        ))}
      </select>

      {exercise && history.length === 0 && (
        <p className="cmpempty">Brak zapisanego treningu z tym ćwiczeniem.</p>
      )}

      {history.length > 0 && (
        <table className="hist">
          <thead>
            <tr>
              <th>Data</th>
              <th>Serie (powt. × kg)</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id}>
                <td>{formatDate(h.date)}</td>
                <td>
                  {h.sets.map((s, j) => (
                    <span className="setchip" key={j}>
                      {s.reps || "–"} × {s.weight || "0"}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </aside>
  );
}
