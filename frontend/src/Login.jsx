import { useState } from "react";
import { login, register } from "./auth.js";

const today = () => new Date().toISOString().slice(0, 10);

export default function Login({ onSuccess }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    birthDate: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const isReg = mode === "reg";

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const switchMode = (m) => {
    setMode(m);
    setError("");
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const email = form.email.trim().toLowerCase();
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();

    if (isReg) {
      if (!firstName || !lastName) return setError("Podaj imię i nazwisko.");
      if (!form.birthDate) return setError("Podaj datę urodzenia.");
      if (form.birthDate > today() || form.birthDate < "1900-01-01") {
        return setError("Data urodzenia jest nieprawidłowa.");
      }
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setError("Wpisz poprawny adres e-mail.");
    if (form.password.length < 8) return setError("Hasło musi mieć co najmniej 8 znaków.");
    if (isReg && form.password !== form.confirmPassword) return setError("Hasła nie są takie same.");

    try {
      const user = isReg
        ? await register({
            email,
            firstName,
            lastName,
            birthDate: form.birthDate,
            password: form.password,
          })
        : await login({ email, password: form.password });
      onSuccess(user);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card">
      <div className="tabs" role="tablist">
        <button className="tab" role="tab" aria-selected={!isReg} onClick={() => switchMode("login")}>
          Logowanie
        </button>
        <button className="tab" role="tab" aria-selected={isReg} onClick={() => switchMode("reg")}>
          Nowe konto
        </button>
      </div>

      <h2>{isReg ? "Zacznij drogę do mistrzostwa" : "Witaj z powrotem"}</h2>
      <p className="sub">{isReg ? "Załóż konto zawodnika." : "Zaloguj się, aby wrócić na matę."}</p>

      <form onSubmit={handleSubmit} noValidate>
        {isReg && (
          <>
            <div className="row">
              <div>
                <label htmlFor="firstName">Imię</label>
                <input id="firstName" value={form.firstName} onChange={set("firstName")} autoComplete="given-name" />
              </div>
              <div>
                <label htmlFor="lastName">Nazwisko</label>
                <input id="lastName" value={form.lastName} onChange={set("lastName")} autoComplete="family-name" />
              </div>
            </div>
            <label htmlFor="birthDate">Data urodzenia</label>
            <input
              id="birthDate"
              type="date"
              value={form.birthDate}
              onChange={set("birthDate")}
              min="1900-01-01"
              max={today()}
              autoComplete="bday"
            />
          </>
        )}
        <label htmlFor="email">E-mail</label>
        <input id="email" type="email" value={form.email} onChange={set("email")} autoComplete="email" />
        <label htmlFor="password">Hasło</label>
        <input
          id="password"
          type="password"
          value={form.password}
          onChange={set("password")}
          autoComplete={isReg ? "new-password" : "current-password"}
        />
        {isReg && (
          <>
            <label htmlFor="confirmPassword">Powtórz hasło</label>
            <input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={set("confirmPassword")}
              autoComplete="new-password"
            />
          </>
        )}
        <p className="err" role="alert">{error}</p>
        <button className="btn" type="submit">{isReg ? "Załóż konto" : "Zaloguj się"}</button>
      </form>
      <p className="note">To wersja demonstracyjna: konta są zapisane tylko w tej przeglądarce.</p>
    </div>
  );
}