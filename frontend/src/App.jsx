import { useState } from "react";
import Login from "./Login.jsx";
import Dashboard from "./Dashboard.jsx";
import Motor from "./Motor.jsx";
import Tests from "./Tests.jsx";
import { getSession, logout } from "./auth.js";

export default function App() {
  const [user, setUser] = useState(getSession);
  const [view, setView] = useState("home");

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
        </nav>
        <div className="who">
          <span>{user.firstName} {user.lastName}</span>
          <button className="btn ghost small" onClick={() => { logout(); setUser(null); setView("home"); }}>
            Wyloguj się
          </button>
        </div>
      </header>
      <main className="content">
        {view === "home" && <Dashboard user={user} onNavigate={setView} />}
        {view === "motor" && <Motor user={user} />}
        {view === "tests" && <Tests user={user} />}
      </main>
    </div>
  );
}