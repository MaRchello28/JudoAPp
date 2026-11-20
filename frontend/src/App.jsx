import { useEffect, useState } from "react";
import Login from "./Login.jsx";
import Dashboard from "./Dashboard.jsx";
import Motor from "./Motor.jsx";
import Tests from "./Tests.jsx";
import Calendar from "./Calendar.jsx";
import Recovery from "./Recovery.jsx";
import { getCurrentUser, logout } from "./auth.js";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("home");

  // Przy starcie sprawdzamy, czy w przeglądarce jest już zapisana sesja logowania.
  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className="loading">Ładowanie…</p>;

  if (!user) {
    return (
      <div className="shell">
        <aside className="hero">
          <div className="brand"><span className="dot" />Ippon</div>
          <p className="kanji" aria-hidden="true">一本</p>
          <div>
            <h1>Codzienny trening na drodze do mistrzostwa świata.</h1>
            <p>Plan treningowy, walki, waga i regeneracja w jednym miejscu.</p>
          </div>
          <span className="belt" />
        </aside>
        <main className="formside">
          <Login onSuccess={setUser} />
        </main>
      </div>
    );
  }

  const nav = (id, label) => (
    <button className="navbtn" aria-current={view === id ? "page" : undefined} onClick={() => setView(id)}>
      {label}
    </button>
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><span className="dot" />Ippon</div>
        <nav>
          {nav("home", "Panel")}
          {nav("motor", "Trening motoryczny")}
          {nav("tests", "Testy")}
          {nav("calendar", "Kalendarz")}
          {nav("recovery", "Regeneracja")}
        </nav>
        <div className="who">
          <span>{user.firstName} {user.lastName}</span>
          <button className="btn ghost small" onClick={async () => { await logout(); setUser(null); setView("home"); }}>
            Wyloguj się
          </button>
        </div>
      </header>
      <main className="content">
        {view === "home" && <Dashboard user={user} onNavigate={setView} />}
        {view === "motor" && <Motor />}
        {view === "tests" && <Tests user={user} />}
        {view === "calendar" && <Calendar user={user} />}
        {view === "recovery" && <Recovery user={user} />}
      </main>
    </div>
  );
}
