import { useState } from "react";
import { ALL_NAMES, UNITS, UNIT_BY_NAME, sjftIndex } from "./motorTests.js";
import { MAX_COLS, MAX_ROWS, emptyRow, getTable, saveTable } from "./motorStorage.js";
import { todayLocal } from "./plans.js";

const DAYS = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
const dayName = (date) => (date ? DAYS[new Date(date + "T12:00:00").getDay()] : "");

export default function TestsMotor({ user, tabs }) {
  const [table, setTable] = useState(() => getTable(user.email));
  const [error, setError] = useState("");
  const { dates, rows } = table;
  const cols = dates.length;

  // Każda zmiana od razu zapisuje się w przeglądarce.
  const commit = (next) => {
    setTable(next);
    setError(saveTable(user.email, next) ? "" : "Nie można zapisać tabeli w tej przeglądarce.");
  };

  const setDate = (c, value) => commit({ ...table, dates: dates.map((d, i) => (i === c ? value : d)) });

  const setName = (r, value) => {
    const defaultUnit = UNIT_BY_NAME.get(value);
    commit({
      ...table,
      rows: rows.map((row, i) =>
        i !== r ? row : { ...row, name: value, unit: defaultUnit !== undefined ? defaultUnit : row.unit }
      ),
    });
  };
  const setUnit = (r, value) =>
    commit({ ...table, rows: rows.map((row, i) => (i === r ? { ...row, unit: value } : row)) });
  const setCell = (r, c, value) =>
    commit({
      ...table,
      rows: rows.map((row, i) =>
        i !== r ? row : { ...row, values: row.values.map((x, j) => (j === c ? value : x)) }
      ),
    });

  function addCol() {
    if (cols >= MAX_COLS) return;
    commit({ dates: [...dates, todayLocal()], rows: rows.map((r) => ({ ...r, values: [...r.values, ""] })) });
  }
  function removeCol() {
    if (cols <= 1) return;
    const hasData = rows.some((r) => r.values[cols - 1] !== "");
    if (hasData && !window.confirm("Ostatnia kolumna zawiera wyniki. Na pewno ją usunąć?")) return;
    commit({ dates: dates.slice(0, -1), rows: rows.map((r) => ({ ...r, values: r.values.slice(0, -1) })) });
  }
  function addRow() {
    if (rows.length >= MAX_ROWS) return;
    commit({ ...table, rows: [...rows, emptyRow(cols)] });
  }
  function removeRow() {
    if (rows.length <= 1) return;
    const last = rows[rows.length - 1];
    const hasData = last.name.trim() !== "" || last.values.some((v) => v !== "");
    if (hasData && !window.confirm("Ostatni wiersz zawiera dane. Na pewno go usunąć?")) return;
    commit({ ...table, rows: rows.slice(0, -1) });
  }

  const indexes = dates.map((_, c) => sjftIndex(rows, c));
  const showIndex = indexes.some((x) => x !== null);

  return (
    <section>
      {tabs}
      <div className="pagehead">
        <h2>Testy motoryczne</h2>
      </div>
      <p className="sub">
        Jedna tabela na wszystkie testy: każdy wiersz to test, a każda kolumna to data pomiaru. Zmiany zapisują się automatycznie.
      </p>

      <datalist id="motorNames">
        {ALL_NAMES.map((n) => <option key={n} value={n} />)}
      </datalist>
      <datalist id="motorUnits">
        {UNITS.map((u) => <option key={u} value={u} />)}
      </datalist>

      <div className="tablewrap">
        <table className="plan">
          <thead>
            <tr>
              <th>Ćwiczenie</th>
              <th>Jednostka</th>
              {dates.map((d, c) => (
                <th key={c}>
                  <input type="date" value={d} onChange={(e) => setDate(c, e.target.value)} aria-label={`Data, kolumna ${c + 1}`} />
                  <span className="dow">{dayName(d)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                <td className="ex">
                  <input
                    list="motorNames"
                    value={row.name}
                    onChange={(e) => setName(r, e.target.value)}
                    placeholder="Wybierz lub wpisz ćwiczenie"
                    aria-label={`Ćwiczenie ${r + 1}`}
                  />
                </td>
                <td className="unitcell">
                  <input
                    list="motorUnits"
                    value={row.unit}
                    onChange={(e) => setUnit(r, e.target.value)}
                    aria-label={`Jednostka, wiersz ${r + 1}`}
                  />
                </td>
                {row.values.map((v, c) => (
                  <td key={c}>
                    <input
                      type="number" min="0" step="any" inputMode="decimal"
                      value={v}
                      onChange={(e) => setCell(r, c, e.target.value)}
                      aria-label={`Wiersz ${r + 1}, kolumna ${c + 1}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {showIndex && (
            <tfoot>
              <tr>
                <td>Indeks SJFT (liczony automatycznie)</td>
                <td>–</td>
                {indexes.map((x, c) => (
                  <td key={c}>{x === null ? "–" : x.toLocaleString("pl-PL", { maximumFractionDigits: 2 })}</td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="toolbar">
        <div className="group">
          <span>Wiersze: {rows.length}</span>
          <button className="btn ghost small" onClick={removeRow} disabled={rows.length <= 1}>Usuń wiersz</button>
          <button className="btn ghost small" onClick={addRow} disabled={rows.length >= MAX_ROWS}>Dodaj wiersz</button>
        </div>
        <div className="group">
          <span>Kolumny: {cols}</span>
          <button className="btn ghost small" onClick={removeCol} disabled={cols <= 1}>Usuń kolumnę</button>
          <button className="btn ghost small" onClick={addCol} disabled={cols >= MAX_COLS}>Dodaj kolumnę</button>
        </div>
        <span className="status" role="status">{error}</span>
      </div>
    </section>
  );
}