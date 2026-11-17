import { useState } from "react";
import { EXERCISES } from "./exercises.js";
import { CATEGORIES, TEST_TYPES, getType, summarize, fieldDisplay } from "./testTypes.js";
import { getTests, saveTest, deleteTest } from "./testStorage.js";
import { formatDate, todayLocal } from "./plans.js";
import TestsMotor from "./TestsMotor.jsx";

function ScaleInput({ field, value, onChange }) {
  const id = `scale-${field.key}`;
  return (
    <div className="scalefield" role="group" aria-labelledby={id}>
      <span id={id} className="scalelabel">{field.label}</span>
      {field.hint && <span className="scalehint">{field.hint}</span>}
      <div className="scale">
        {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((n) => (
          <button
            type="button"
            key={n}
            className="scalebtn"
            aria-pressed={value === n}
            onClick={() => onChange(value === n ? "" : n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function FieldInput({ field, value, onChange }) {
  const id = `f-${field.key}`;
  if (field.type === "exercise") {
    return (
      <select id={id} className="selectbox" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Wybierz ćwiczenie</option>
        {EXERCISES.map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.items.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </optgroup>
        ))}
      </select>
    );
  }
  if (field.type === "choice") {
    return (
      <select id={id} className="selectbox" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Wybierz</option>
        {field.options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }
  if (field.type === "textarea") {
    return <textarea id={id} rows={3} value={value} onChange={(e) => onChange(e.target.value)} />;
  }
  const isNumber = field.type === "number";
  return (
    <input
      id={id}
      type={isNumber ? "number" : "text"}
      min={isNumber ? field.min : undefined}
      max={isNumber ? field.max : undefined}
      step={isNumber ? field.step ?? "any" : undefined}
      inputMode={isNumber ? "decimal" : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function TestForm({ type, onSave, onBack }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(type.fields.map((f) => [f.key, f.default ?? ""]))
  );
  const [date, setDate] = useState(todayLocal());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const set = (key) => (value) => setValues((v) => ({ ...v, [key]: value }));
  const isEmpty = (v) => String(v).trim() === "";

  function submit(e) {
    e.preventDefault();
    setError("");
    const missing = type.fields.find((f) => f.required && isEmpty(values[f.key]));
    if (missing) return setError(`Uzupełnij pole: ${missing.label}.`);

    const bad = type.fields.find((f) => {
      if (f.type !== "number" || isEmpty(values[f.key])) return false;
      const x = parseFloat(String(values[f.key]).replace(",", "."));
      return !(x >= (f.min ?? 0)) || (f.max !== undefined && x > f.max);
    });
    if (bad) {
      const range = bad.max !== undefined ? ` (zakres ${bad.min ?? 0}–${bad.max})` : "";
      return setError(`Wpisz poprawną liczbę w polu: ${bad.label}${range}.`);
    }

    // Wynik to pole inne niż opisowe, zmienione względem wartości domyślnej.
    const hasResult = type.fields.some((f) => !f.meta && !isEmpty(values[f.key]) && values[f.key] !== (f.default ?? ""));
    if (!hasResult) return setError("Wpisz przynajmniej jeden wynik.");
    if (!date) return setError("Podaj datę testu.");
    try {
      onSave({ typeId: type.id, date, values, note: note.trim() });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="testform">
      <div className="pagehead">
        <h2>{type.name}</h2>
        <button className="btn ghost small" onClick={onBack}>Wybierz inny test</button>
      </div>
      <p className="sub">{type.description}</p>

      <form onSubmit={submit} noValidate>
        <div className="fields">
          {type.fields.map((f) =>
            f.type === "scale" ? (
              <ScaleInput key={f.key} field={f} value={values[f.key]} onChange={set(f.key)} />
            ) : (
              <div key={f.key} className={f.type === "textarea" ? "fullrow" : undefined}>
                <label htmlFor={`f-${f.key}`}>{f.label}{f.unit ? ` (${f.unit})` : ""}</label>
                <FieldInput field={f} value={values[f.key]} onChange={set(f.key)} />
              </div>
            )
          )}
        </div>

        <div className="fields">
          <div>
            <label htmlFor="testDate">Data testu</label>
            <input id="testDate" type="date" value={date} max={todayLocal()} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label htmlFor="testNote">Notatka (opcjonalnie)</label>
            <input id="testNote" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <p className="err" role="alert">{error}</p>
        <div className="formactions">
          <button className="btn small" type="submit">Zapisz wynik</button>
        </div>
      </form>
    </section>
  );
}

function TestsOther({ user, tabs }) {
  const [results, setResults] = useState(() => getTests(user.email));
  const [mode, setMode] = useState("list"); // "list" | "choose" | "form"
  const [typeId, setTypeId] = useState(null);
  const [filter, setFilter] = useState("");

  if (mode === "form") {
    return (
      <TestForm
        key={typeId}
        type={getType(typeId)}
        onBack={() => setMode("choose")}
        onSave={(test) => {
          saveTest(user.email, test);
          setResults(getTests(user.email));
          setMode("list");
        }}
      />
    );
  }

  if (mode === "choose") {
    return (
      <section>
        <div className="pagehead">
          <h2>Wybierz rodzaj testu</h2>
          <button className="btn ghost small" onClick={() => setMode("list")}>Anuluj</button>
        </div>
        {CATEGORIES.map((cat) => (
          <div key={cat}>
            <h3 className="catlabel">{cat}</h3>
            <div className="tiles">
              {TEST_TYPES.filter((t) => t.category === cat).map((t) => (
                <button
                  key={t.id}
                  className="tile"
                  onClick={() => {
                    setTypeId(t.id);
                    setMode("form");
                  }}
                >
                  <strong>{t.name}</strong>
                  <span>{t.short}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>
    );
  }

  function remove(r) {
    if (!window.confirm("Usunąć ten wynik?")) return;
    deleteTest(user.email, r.id);
    setResults(getTests(user.email));
  }

  const shown = results
    .filter((r) => !filter || r.typeId === filter)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  const hasValue = (r, f) => r.values[f.key] !== undefined && String(r.values[f.key]).trim() !== "";

  return (
    <section>
      {tabs}
      <div className="pagehead">
        <h2>Pozostałe testy</h2>
        <button className="btn small" onClick={() => setMode("choose")}>Nowy test</button>
      </div>

      {results.length === 0 ? (
        <p className="sub">Nie masz jeszcze żadnych wyników. Wybierz „Nowy test”, aby dodać pierwszy.</p>
      ) : (
        <>
          <div className="filter">
            <label htmlFor="testFilter">Pokaż</label>
            <select id="testFilter" className="selectbox" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">Wszystkie testy</option>
              {CATEGORIES.map((cat) => (
                <optgroup key={cat} label={cat}>
                  {TEST_TYPES.filter((t) => t.category === cat).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {shown.length === 0 && <p className="sub">Brak wyników tego testu.</p>}
          <ul className="resultlist">
            {shown.map((r) => {
              const type = getType(r.typeId);
              if (!type) return null;
              const summary = summarize(type, r.values);
              return (
                <li className="result" key={r.id}>
                  <div className="resulthead">
                    <div>
                      <strong>{type.name}</strong>
                      <span className="muted">{formatDate(r.date)}</span>
                    </div>
                    <button className="btn ghost small" onClick={() => remove(r)}>Usuń</button>
                  </div>
                  {summary && <p className="summary">{summary}</p>}
                  <div>
                    {type.fields
                      .filter((f) => f.type !== "textarea" && hasValue(r, f))
                      .map((f) => (
                        <span className="setchip" key={f.key}>
                          {f.label}: {fieldDisplay(f, r.values[f.key])}
                        </span>
                      ))}
                  </div>
                  {type.fields
                    .filter((f) => f.type === "textarea" && hasValue(r, f))
                    .map((f) => (
                      <p className="resultnote" key={f.key}>
                        <strong>{f.label}:</strong> {r.values[f.key]}
                      </p>
                    ))}
                  {r.note && <p className="resultnote">Notatka: {r.note}</p>}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

export default function Tests({ user }) {
  const [section, setSection] = useState("motor");

  const tabs = (
    <div className="tabs sectiontabs" role="tablist">
      <button className="tab" role="tab" aria-selected={section === "motor"} onClick={() => setSection("motor")}>
        Motoryczne
      </button>
      <button className="tab" role="tab" aria-selected={section === "other"} onClick={() => setSection("other")}>
        Pozostałe
      </button>
    </div>
  );

  return section === "motor" ? <TestsMotor user={user} tabs={tabs} /> : <TestsOther user={user} tabs={tabs} />;
}