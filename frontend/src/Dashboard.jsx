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
          <span>Tabela testów motorycznych oraz badania, skład ciała, biomechanika i psychologia.</span>
        </button>
        <div className="tile off"><strong>Dziennik walk i techniki</strong><span>Wkrótce</span></div>
        <button className="tile" onClick={() => onNavigate("recovery")}>
          <strong>Regeneracja</strong>
          <span>HRV, tętno spoczynkowe i sen z trendami oraz sygnałami przeciążenia.</span>
        </button>
        <button className="tile" onClick={() => onNavigate("calendar")}>
          <strong>Kalendarz</strong>
          <span>Zawody, które Cię interesują, i plan aktywności na każdy dzień.</span>
        </button>
      </div>
    </section>
  );
}