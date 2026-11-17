import { useState } from "react";
import TrendChart from "./TrendChart.jsx";
import {
  HRV_BASE_DAYS, HRV_WARN, HRV_ALERT, RHR_BASE_DAYS, RHR_WARN, RHR_ALERT,
  getEntries, saveEntry, deleteEntry, addDays, baseline, assess,
} from "./recoveryStore.js";
import { formatDate, todayLocal } from "./plans.js";

// Pola wpisu. Wartości można wpisać ręcznie; później dojdą dane z zegarków i opasek.
const SPEC = [
  { key: "hrv", label: "HRV (RMSSD)", unit: "ms", min: 1, max: 300, step: "any" },
  { key: "rhr", label: "Tętno spoczynkowe (RHR)", unit: "uderzeń/min", min: 25, max: 130, step: 1 },
  { key: "sleepMin", label: "Całkowity czas snu", unit: "min", min: 0, max: 1440, step: 1 },
  { key: "efficiency", label: "Efektywność snu", unit: "%", min: 0, max: 100, step: "any" },
  { key: "deepMin", label: "Sen głęboki", unit: "min", min: 0, max: 1440, step: 1 },
  { key: "remMin", label: "Sen REM", unit: "min", min: 0, max: 1440, step: 1 },
];

const toNum = (v) => (String(v).trim() === "" ? null : parseFloat(String(v).replace(",", ".")));
const num1 = (v) => v.toLocaleString("pl-PL", { maximumFractionDigits: 1 });
const hm = (min) => `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, "0")} min`;
const blank = (date) => ({ date, hrv: "", rhr: "", sleepMin: "", efficiency: "", deepMin: "", remMin: "" });
const formFrom = (entries, date) => {
  const e = entries.find((x) => x.date === date);
  return e ? { date, ...Object.fromEntries(SPEC.map((s) => [s.key, e[s.key] == null ? "" : String(e[s.key])])) } : blank(date);
};

const LEVELS = {
  hrv: { ok: "W normie", warn: "Lekki spadek", alert: "Duży spadek", none: "Za mało danych" },
  rhr: { ok: "W normie", warn: "Podwyższone", alert: "Wyraźnie podwyższone", none: "Za mało danych" },
};

export default function Recovery({ user }) {
  const today = todayLocal();
  const [entries, setEntries] = useState(() => getEntries(user.email));
  const [form, setForm] = useState(() => formFrom(getEntries(user.email), today));
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [range, setRange] = useState(30);

  const existing = entries.find((e) => e.date === form.date);
  const latest = entries[entries.length - 1];
  const a = latest ? assess(entries, latest) : null;

  const setField = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    setStatus("");
  };
  const changeDate = (date) => {
    setForm(formFrom(entries, date));
    setError("");
    setStatus("");
  };

  function submit(e) {
    e.preventDefault();
    setError("");
    setStatus("");
    if (!form.date) return setError("Podaj datę.");
    const entry = { date: form.date, source: "manual" };
    for (const s of SPEC) {
      const v = toNum(form[s.key]);
      if (v !== null && !(v >= s.min && v <= s.max)) {
        return setError(`Wpisz poprawną wartość w polu: ${s.label} (zakres ${s.min}–${s.max} ${s.unit}).`);
      }
      entry[s.key] = v;
    }
    if (SPEC.every((s) => entry[s.key] === null)) return setError("Wpisz przynajmniej jeden pomiar.");
    if (entry.sleepMin !== null && (entry.deepMin ?? 0) + (entry.remMin ?? 0) > entry.sleepMin) {
      return setError("Sen głęboki i REM razem nie mogą być dłuższe niż całkowity czas snu.");
    }
    try {
      setEntries(saveEntry(user.email, entry));
      setStatus(`Zapisano wpis z dnia ${formatDate(entry.date)}.`);
    } catch (err) {
      setError(err.message);
    }
  }

  function edit(entry) {
    setForm(formFrom(entries, entry.date));
    setError("");
    setStatus("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function remove(entry) {
    if (!window.confirm(`Usunąć wpis z dnia ${formatDate(entry.date)}?`)) return;
    setEntries(deleteEntry(user.email, entry.date));
    if (form.date === entry.date) setForm(blank(entry.date));
  }

  // Dane do wykresów: ostatnie `range` dni.
  const days = Array.from({ length: range }, (_, i) => addDays(today, -(range - 1 - i)));
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const col = (key, fn = (v) => v) => days.map((d) => (byDate.get(d)?.[key] != null ? fn(byDate.get(d)[key]) : null));
  const avgOf = (key, n) => days.map((d) => (byDate.get(d)?.[key] != null ? baseline(entries, d, key, n) : null));

  const ent = latest;
  const deepPct = ent && ent.sleepMin && ent.deepMin != null ? (ent.deepMin / ent.sleepMin) * 100 : null;
  const remPct = ent && ent.sleepMin && ent.remMin != null ? (ent.remMin / ent.sleepMin) * 100 : null;

  return (
    <section>
      <div className="pagehead">
        <h2>Regeneracja</h2>
      </div>

      <div className="recwrap">
        <div>
          {!latest ? (
            <p className="sub">Nie masz jeszcze żadnych wpisów. Wpisz pierwszy pomiar w panelu obok: HRV, tętno spoczynkowe i parametry snu.</p>
          ) : (
            <div className="signals">
              <h3>Ostatni wpis: {formatDate(latest.date)}</h3>
              <div className="metrics">
                <div className="metric">
                  <span className="mlabel">HRV (RMSSD)</span>
                  <strong className="mvalue">{latest.hrv != null ? `${num1(latest.hrv)} ms` : "–"}</strong>
                  <span className={`badge ${a.hrv.level}`}>{latest.hrv != null ? LEVELS.hrv[a.hrv.level] : "Brak pomiaru"}</span>
                  {a.hrv.base !== null && (
                    <span className="msub">
                      {a.hrv.changePct > 0 ? "+" : "−"}{num1(Math.abs(a.hrv.changePct))}% względem średniej z {HRV_BASE_DAYS} dni ({num1(a.hrv.base)} ms)
                    </span>
                  )}
                </div>
                <div className="metric">
                  <span className="mlabel">Tętno spoczynkowe</span>
                  <strong className="mvalue">{latest.rhr != null ? `${num1(latest.rhr)} /min` : "–"}</strong>
                  <span className={`badge ${a.rhr.level}`}>{latest.rhr != null ? LEVELS.rhr[a.rhr.level] : "Brak pomiaru"}</span>
                  {a.rhr.base !== null && (
                    <span className="msub">
                      {a.rhr.diff >= 0 ? "+" : "−"}{num1(Math.abs(a.rhr.diff))} względem normy z {RHR_BASE_DAYS} dni ({num1(a.rhr.base)} /min)
                    </span>
                  )}
                </div>
                <div className="metric">
                  <span className="mlabel">Sen</span>
                  <strong className="mvalue">{latest.sleepMin != null ? hm(latest.sleepMin) : "–"}</strong>
                  <span className="msub">
                    {[
                      latest.efficiency != null && `efektywność ${num1(latest.efficiency)}%`,
                      latest.deepMin != null && `głęboki ${num1(latest.deepMin)} min${deepPct !== null ? ` (${Math.round(deepPct)}%)` : ""}`,
                      latest.remMin != null && `REM ${num1(latest.remMin)} min${remPct !== null ? ` (${Math.round(remPct)}%)` : ""}`,
                    ].filter(Boolean).join(", ") || "Brak danych o śnie"}
                  </span>
                </div>
              </div>
              {(a.hrv.level === "warn" || a.hrv.level === "alert") && (
                <p className="signote">Spadek HRV względem średniej z 7 dni to pierwszy sygnał przeciążenia lub nadchodzącej infekcji.</p>
              )}
              {(a.rhr.level === "warn" || a.rhr.level === "alert") && (
                <p className="signote">Podwyższone tętno spoczynkowe może oznaczać brak pełnej regeneracji, odwodnienie (częste przy zbijaniu wagi) albo stres.</p>
              )}
              <p className="muted">
                Progi są orientacyjne: spadek HRV o {HRV_WARN}% to lekki, a o {HRV_ALERT}% duży; tętno wyższe o {RHR_WARN} to podwyższone, a o {RHR_ALERT} uderzeń wyraźnie podwyższone. To wskazówka, nie diagnoza.
              </p>
            </div>
          )}

          <div className="charthead">
            <h3>Trendy</h3>
            <label htmlFor="recRange">Okres</label>
            <select id="recRange" className="selectbox" value={range} onChange={(e) => setRange(Number(e.target.value))}>
              <option value={14}>14 dni</option>
              <option value={30}>30 dni</option>
              <option value={90}>90 dni</option>
            </select>
          </div>
          <div className="charts">
            <TrendChart
              title="HRV (RMSSD, ms)"
              days={days}
              digits={0}
              series={[
                { label: "HRV", kind: "main", values: col("hrv") },
                { label: `Średnia z poprzednich ${HRV_BASE_DAYS} dni`, kind: "avg", values: avgOf("hrv", HRV_BASE_DAYS) },
              ]}
            />
            <TrendChart
              title="Tętno spoczynkowe (uderzeń/min)"
              days={days}
              digits={0}
              series={[
                { label: "RHR", kind: "main", values: col("rhr") },
                { label: `Norma z poprzednich ${RHR_BASE_DAYS} dni`, kind: "avg", values: avgOf("rhr", RHR_BASE_DAYS) },
              ]}
            />
            <TrendChart
              title="Całkowity czas snu (godziny)"
              days={days}
              digits={1}
              series={[{ label: "Sen", kind: "main", values: col("sleepMin", (v) => v / 60) }]}
            />
            <TrendChart
              title="Sen głęboki i REM (minuty)"
              days={days}
              digits={0}
              series={[
                { label: "Sen głęboki", kind: "main", values: col("deepMin") },
                { label: "Sen REM", kind: "alt", values: col("remMin") },
              ]}
            />
          </div>

          {entries.length > 0 && (
            <>
              <h3 className="histtitle">Historia wpisów</h3>
              <div className="tablewrap histscroll">
                <table className="plan">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>HRV (ms)</th>
                      <th>RHR</th>
                      <th>Sen</th>
                      <th>Efektywność</th>
                      <th>Głęboki</th>
                      <th>REM</th>
                      <th>Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...entries].reverse().map((e) => (
                      <tr key={e.date}>
                        <td>{formatDate(e.date)}</td>
                        <td>{e.hrv != null ? num1(e.hrv) : "–"}</td>
                        <td>{e.rhr != null ? num1(e.rhr) : "–"}</td>
                        <td>{e.sleepMin != null ? hm(e.sleepMin) : "–"}</td>
                        <td>{e.efficiency != null ? `${num1(e.efficiency)}%` : "–"}</td>
                        <td>{e.deepMin != null ? `${num1(e.deepMin)} min` : "–"}</td>
                        <td>{e.remMin != null ? `${num1(e.remMin)} min` : "–"}</td>
                        <td className="actions">
                          <button className="btn ghost small" onClick={() => edit(e)}>Edytuj</button>
                          <button className="btn ghost small" onClick={() => remove(e)}>Usuń</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <aside>
          <div className="sidepanel">
            <h3>Wpis dzienny</h3>
            <p className="muted">Dane wpisujesz ręcznie. W przyszłości połączymy zegarki i opaski (Garmin, Whoop, Oura, Apple Health).</p>
            <form onSubmit={submit} noValidate>
              <label htmlFor="recDate">Data</label>
              <input id="recDate" type="date" value={form.date} max={today} onChange={(e) => changeDate(e.target.value)} />
              {existing && <p className="muted">Wpis z tego dnia już istnieje, zapis go zastąpi.</p>}

              {SPEC.map((s) => (
                <div key={s.key}>
                  <label htmlFor={`rec-${s.key}`}>{s.label} ({s.unit})</label>
                  <input
                    id={`rec-${s.key}`}
                    type="number"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    inputMode="decimal"
                    value={form[s.key]}
                    onChange={setField(s.key)}
                  />
                  {s.key === "sleepMin" && toNum(form.sleepMin) > 0 && <p className="muted">{hm(toNum(form.sleepMin))}</p>}
                </div>
              ))}

              <p className="err" role="alert">{error}</p>
              <button className="btn small" type="submit">Zapisz wpis</button>
              {status && <p className="status" role="status">{status}</p>}
            </form>
          </div>
        </aside>
      </div>
    </section>
  );
}
