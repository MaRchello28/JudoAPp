export default function Dashboard({ user, onNavigate }) {
  return (
    <section>
      <h2>Osu, {user.firstName}!</h2>
      <p className="sub">Wybierz moduł, nad którym dziś pracujesz.</p>
      <div className="tiles">
        <button className="tile" onClick={() => onNavigate("motor")}>
          <strong>Trening motoryczny</strong>
          <span>Ułóż plan: ćwiczenia, serie, powtórzenia i obciążenie.</span>
        </button>
        <button className="tile" onClick={() => onNavigate("tests")}>
          <strong>Testy</strong>
          <span>Czas reakcji, maksy siłowe, wydolność judo i testy psychologiczne.</span>
        </button>
        <div className="tile off"><strong>Dziennik walk i techniki</strong><span>Wkrótce</span></div>
        <div className="tile off"><strong>Waga i regeneracja</strong><span>Wkrótce</span></div>
        <div className="tile off"><strong>Kalendarz zawodów</strong><span>Wkrótce</span></div>
      </div>
    </section>
  );
}