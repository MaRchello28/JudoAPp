import { useState } from "react";
import { ALL_NAMES, MOTOR_GROUPS, UNITS, UNIT_BY_NAME, sjftIndex } from "./motorTests.js";
import { MAX_COLS, MAX_ROWS, emptyRow, saveSession } from "./motorStorage.js";

const DAYS = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];

export default function TestsMotorEditor({ user, initial, onBack, onRepeat }) {
  const [session, setSession] = useState(initial);
  const [status, setStatus] = useState("");
  const { rows, cols } = session;

  const update = (patch) => {
    setSession((s) => ({ ...s, ...patch }));
    setStatus("");
  };

  const setName = (r, value) => {
    const defaultUnit = UNIT_BY_NAME.get(value);
    update({
      rows: rows.map((row, i) =>
        i !== r ? row : { ...row, name: value, unit: defaultUnit !== undefined ? defaultUnit : row.unit }
      ),
    });
  };
  const setUnit = (r, value) => update({ rows: rows.map((row, i) => (i === r ? { ...row, unit: value } : row)) });
  const setCell = (r, c, value) =>
    update({
      rows: rows.map((row, i) =>
        i !== r ? row : { ...row, values: row.values.map((x, j) => (j === c ? value : x)) }
      ),
    });

  function addCol() {
    if (cols >= MAX_COLS) return;
    update({ cols: cols + 1, rows: rows.map((r) => ({ ...r, values: [...r.values, ""] })) });
  }
  function removeCol() {
    if (cols <= 1) return;
    const hasData = rows.some((r) => r.values[cols - 1] !== "");
    if (hasData && !window.confirm("Ostatnia kolumna zawiera wyniki. Na pewno ją usunąć?")) return;
    update({ cols: cols - 1, rows: rows.map((r) => ({ ...r, values: r.values.slice(0, -1) })) });
  }
  function addRow() {
    if (rows.length >= MAX_ROWS) return;
    update({ rows: [...rows, emptyRow(cols)] });
  }
  function removeRow() {
    if (rows.length <= 1) return;
    const last = rows[rows.length - 1];
    const hasData = last.name.trim() !== "" || last.values.some((v) => v !== "");
    if (hasData && !window.confirm("Ostatni wiersz zawiera dane. Na pewno go usunąć?")) return;
    update({ rows: rows.slice(0, -1) });
  }

  function handleSave() {
    try {
      const name = session.name.trim() || `Testy motoryczne z ${session.date}`;
      setSession(saveSession(user.email, { ...session, name }));
      setStatus("Tabela zapisana.");
    } catch (err) {
      setStatus(err.message);
    }
  }

  const day = session.date ? DAYS[new Date(session.date + "T12:00:00").getDay()] : "–";
  const indexes = Array.from({ length: cols }, (_, c) => sjftIndex(rows, c));
  const showIndex = indexes.some((x) => x !== null);

  return (
    <section>
      <div className="pagehead">
        <h2>{session.id ? "Edycja testów motorycznych" : "Nowa tabela testów motorycznych"}</h2>
        <button className="btn ghost small" onClick={onBack}>Wróć do listy</button>
      </div>

      <div className="meta">
        <div>
          <label htmlFor="sessionName">Nazwa (opcjonalnie)</label>
          <input id="sessionName" value={session.name} onChange={(e) => update({ name: e.target.value })} placeholder="np. Testy przed sezonem" />
        </div>
      </div>

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
              <th colSpan={2}>
                <input
                  type="date"
                  value={session.date}
                  onChange={(e) => update({ date: e.target.value })}
                  aria-label="Data testów"
                />
              </th>
              <th colSpan={cols}>Dzień tygodnia: {day}</th>
            </tr>
            <tr>
              <th>Test</th>
              <th>Jednostka</th>
              {Array.from({ length: cols }, (_, c) => (
                <th key={c}>Próba {c + 1}</th>
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
                    placeholder="Wybierz lub wpisz test"
                    aria-label={`Test ${r + 1}`}
                  />
                </td>
                <td className="unitcell">
                  <input
                    list="motorUnits"
                    value={row.unit}
                    onChange={(e) => setUnit(r, e.target.value)}
                    aria-label={`Jednostka, test ${r + 1}`}
                  />
                </td>
                {row.values.map((v, c) => (
                  <td key={c}>
                    <input
                      type="number" min="0" step="any" inputMode="decimal"
                      value={v}
                      onChange={(e) => setCell(r, c, e.target.value)}
                      aria-label={`Test ${r + 1}, próba ${c + 1}`}
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
      </div>

      <div className="toolbar">
        <button className="btn small" onClick={handleSave}>Zapisz tabelę</button>
        {session.id && (
          <button className="btn ghost small" onClick={() => onRepeat(session)}>Powtórz testy</button>
        )}
        <span className="status" role="status">{status}</span>
      </div>
    </section>
  );
}
