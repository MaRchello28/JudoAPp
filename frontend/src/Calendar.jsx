import { useState } from "react";
import {
  ACTIVITY_TYPES,
  COMPETITION_STATUSES,
  MAX_ACTIVITIES,
  MONTHS,
  WEEKDAYS_SHORT,
  WEEKDAYS_LONG,
  REST,
  typeById,
  sortTypes,
  parseKey,
  daysUntil,
  monthCells,
  getCalendar,
  saveCalendar,
} from "./calendarStore.js";
import { formatDate, todayLocal } from "./plans.js";

const countdown = (n) => (n === 0 ? "dzisiaj" : n === 1 ? "jutro" : `za ${n} dni`);
const tc = (id) => ({ "--tc": `var(--c-${id})` });

export default function Calendar({ user }) {
  const today = todayLocal();
  const [cal, setCal] = useState(() => getCalendar(user.email));
  const [error, setError] = useState("");
  const [view, setView] = useState({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 });
  const [selected, setSelected] = useState(today);
  const [form, setForm] = useState({ name: "", date: today, place: "", status: "interested" });
  const [formError, setFormError] = useState("");

  // Każda zmiana od razu zapisuje się w przeglądarce.
  const commit = (next) => {
    setCal(next);
    setError(saveCalendar(user.email, next) ? "" : "Nie można zapisać kalendarza w tej przeglądarce.");
  };

  const compsOn = (date) => cal.competitions.filter((c) => c.date === date);
  // Pusta lista oznacza odpoczynek. Zawody z listy zawsze wygrywają z ręcznie wybranymi aktywnościami.
  const typesOf = (date) => (compsOn(date).length ? ["competition"] : sortTypes(cal.days[date]?.types || []));

  function updateDay(date, patch) {
    const entry = { types: [], note: "", ...(cal.days[date] || {}), ...patch };
    const days = { ...cal.days };
    if (!entry.types.length && !entry.note) delete days[date];
    else days[date] = entry;
    commit({ ...cal, days });
  }

  function toggleType(date, id) {
    const cur = cal.days[date]?.types || [];
    let next;
    if (id === "competition") next = cur.includes(id) ? [] : [id];
    else if (cur.includes(id)) next = cur.filter((t) => t !== id);
    else next = [...cur.filter((t) => t !== "competition"), id];
    if (next.length > MAX_ACTIVITIES) return;
    updateDay(date, { types: next });
  }

  function goTo(date) {
    const d = parseKey(date);
    setSelected(date);
    setView({ year: d.getFullYear(), month: d.getMonth() });
    setForm((f) => ({ ...f, date }));
  }

  function shiftMonth(delta) {
    const m = view.month + delta;
    setView({ year: view.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 });
  }

  function addCompetition(e) {
    e.preventDefault();
    setFormError("");
    if (!form.name.trim()) return setFormError("Podaj nazwę zawodów.");
    if (!form.date) return setFormError("Podaj datę zawodów.");
    const competition = {
      id: String(Date.now()),
      name: form.name.trim(),
      date: form.date,
      place: form.place.trim(),
      status: form.status,
    };
    commit({ ...cal, competitions: [...cal.competitions, competition] });
    setForm({ name: "", date: form.date, place: "", status: form.status });
    goTo(form.date);
  }

  function removeCompetition(c) {
    if (!window.confirm(`Usunąć zawody „${c.name}” z kalendarza?`)) return;
    commit({ ...cal, competitions: cal.competitions.filter((x) => x.id !== c.id) });
  }

  const setStatus = (id, status) =>
    commit({ ...cal, competitions: cal.competitions.map((c) => (c.id === id ? { ...c, status } : c)) });

  const cells = monthCells(view.year, view.month);
  const counts = {};
  cells.filter((c) => c.inMonth).forEach((c) => {
    typesOf(c.key).forEach((id) => {
      counts[id] = (counts[id] || 0) + 1;
    });
  });

  const upcoming = cal.competitions.filter((c) => c.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = cal.competitions.filter((c) => c.date < today).sort((a, b) => b.date.localeCompare(a.date));
  const next = upcoming[0];

  const selectedComps = compsOn(selected);
  const locked = selectedComps.length > 0;
  const selectedTypes = typesOf(selected);
  const full = selectedTypes.length >= MAX_ACTIVITIES;

  const typeButton = (t) => {
    const pressed = selectedTypes.includes(t.id);
    return (
      <button
        key={t.id}
        type="button"
        className="typebtn"
        style={tc(t.id)}
        aria-pressed={pressed}
        disabled={locked || (full && !pressed && t.id !== "competition")}
        onClick={() => toggleType(selected, t.id)}
      >
        <span className="swatch" />
        {t.label}
      </button>
    );
  };

  return (
    <section>
      <div className="pagehead">
        <h2>Kalendarz</h2>
      </div>

      {next && (
        <p className="countdown">
          Najbliższe zawody: <strong>{next.name}</strong> · {formatDate(next.date)} · {countdown(daysUntil(next.date, today))}
        </p>
      )}

      <div className="calwrap">
        <div>
          <div className="calhead">
            <button className="btn ghost small" onClick={() => shiftMonth(-1)} aria-label="Poprzedni miesiąc">‹</button>
            <h3 className="monthtitle">{MONTHS[view.month]} {view.year}</h3>
            <button className="btn ghost small" onClick={() => shiftMonth(1)} aria-label="Następny miesiąc">›</button>
            <button className="btn ghost small" onClick={() => goTo(today)}>Dzisiaj</button>
          </div>

          <div className="calgrid">
            {WEEKDAYS_SHORT.map((w) => (
              <div className="dow7" key={w}>{w}</div>
            ))}
            {cells.map((cell) => {
              const types = typesOf(cell.key);
              const comps = compsOn(cell.key);
              const isComp = types.includes("competition");
              const hasNote = Boolean(cal.days[cell.key]?.note);
              const what = types.length ? types.map((id) => typeById(id).label).join(", ") : REST.label;
              return (
                <button
                  key={cell.key}
                  className={`day${cell.inMonth ? "" : " other"}${cell.key === today ? " today" : ""}${isComp ? " comp" : ""}`}
                  aria-pressed={cell.key === selected}
                  aria-label={`${formatDate(cell.key)}: ${what}${hasNote ? ", z notatką" : ""}`}
                  onClick={() => goTo(cell.key)}
                >
                  <span className="num">{cell.day}</span>
                  {types.length > 0 && (
                    <span className="bands">
                      {types.map((id) => (
                        <span key={id} className="band" style={tc(id)}>
                          <span className="bt">{isComp && comps[0] ? comps[0].name : typeById(id).short}</span>
                        </span>
                      ))}
                    </span>
                  )}
                  {hasNote && <span className="notedot" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <ul className="legend">
            {ACTIVITY_TYPES.map((t) => (
              <li key={t.id} style={tc(t.id)}>
                <span className="swatch" />
                {t.short}: <strong>{counts[t.id] || 0}</strong>
              </li>
            ))}
          </ul>
          <p className="muted">Liczba dni w wyświetlanym miesiącu. Puste pole oznacza odpoczynek.</p>
          {error && <p className="err" role="alert">{error}</p>}
        </div>

        <aside>
          <div className="sidepanel">
            <h3>{WEEKDAYS_LONG[parseKey(selected).getDay()]}, {formatDate(selected)}</h3>
            <p className="muted">Wybierz do {MAX_ACTIVITIES} aktywności w jednym dniu. Brak wyboru oznacza odpoczynek.</p>
            {locked && (
              <p className="compnote">
                Zawody w tym dniu: {selectedComps.map((c) => c.name).join(", ")}. Aby zmienić aktywności, usuń zawody z listy poniżej.
              </p>
            )}
            <div className="typelist" role="group" aria-label="Rodzaj aktywności">
              {ACTIVITY_TYPES.filter((t) => !t.extra).map(typeButton)}
              <p className="subtle">Dodatkowe</p>
              {ACTIVITY_TYPES.filter((t) => t.extra).map(typeButton)}
            </div>
            <button
              className="btn ghost small clearbtn"
              onClick={() => updateDay(selected, { types: [] })}
              disabled={locked || selectedTypes.length === 0}
            >
              Wyczyść aktywności
            </button>
            <label htmlFor="dayNote">Notatka do dnia</label>
            <input
              id="dayNote"
              value={cal.days[selected]?.note || ""}
              maxLength={200}
              onChange={(e) => updateDay(selected, { note: e.target.value })}
              placeholder="np. przysiady 5×5, lekka sauna"
            />
          </div>

          <div className="sidepanel">
            <h3>Moje zawody</h3>
            <form onSubmit={addCompetition} noValidate>
              <label htmlFor="cName">Nazwa zawodów</label>
              <input id="cName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <label htmlFor="cDate">Data</label>
              <input id="cDate" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              <label htmlFor="cPlace">Miejsce (opcjonalnie)</label>
              <input id="cPlace" value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} />
              <label htmlFor="cStatus">Status</label>
              <select id="cStatus" className="selectbox" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {COMPETITION_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <p className="err" role="alert">{formError}</p>
              <button className="btn small" type="submit">Dodaj zawody</button>
            </form>

            {cal.competitions.length === 0 ? (
              <p className="muted">Nie dodano jeszcze zawodów. Dodane zawody zaznaczą się w kalendarzu na czerwono.</p>
            ) : (
              <ul className="complist">
                {[...upcoming, ...past].map((c) => (
                  <li key={c.id} className={`compitem${c.date < today ? " past" : ""}`}>
                    <button className="complink" onClick={() => goTo(c.date)}>
                      <strong>{c.name}</strong>
                      <span>
                        {formatDate(c.date)}
                        {c.place ? ` · ${c.place}` : ""}
                        {c.date < today ? " · minęły" : ""}
                      </span>
                    </button>
                    <select
                      className="selectbox"
                      aria-label={`Status: ${c.name}`}
                      value={c.status}
                      onChange={(e) => setStatus(c.id, e.target.value)}
                    >
                      {COMPETITION_STATUSES.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                    <button className="btn ghost small" onClick={() => removeCompetition(c)}>Usuń</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}