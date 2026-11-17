// Definicje rodzajów testów. Aby dodać nowy test, dopisz obiekt do TEST_TYPES.
// Typy pól: "number", "scale" (1–10), "exercise" (z bazy ćwiczeń), "choice" (lista options),
// "text", "textarea". Pole z meta: true to opis (np. urządzenie), a nie wynik.

const n = (v) => {
  const x = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(x) ? x : null;
};
const nums = (values, keys) => keys.map((k) => n(values[k])).filter((x) => x !== null);
const avg = (list) => list.reduce((a, b) => a + b, 0) / list.length;
const sum = (list) => list.reduce((a, b) => a + b, 0);
const fmt = (x, d = 1) => x.toLocaleString("pl-PL", { maximumFractionDigits: d });

// Skrót na pole liczbowe.
const lab = (key, label, unit, extra = {}) => ({ key, label, type: "number", unit, min: 0, ...extra });

// Skrót na podsumowanie: [klucz, nazwa, jednostka, miejsca po przecinku].
const parts = (v, items) =>
  items
    .map(([key, label, unit, d = 1]) => {
      const x = n(v[key]);
      return x === null ? null : `${label} ${fmt(x, d)}${unit ? " " + unit : ""}`;
    })
    .filter(Boolean)
    .join(", ");

const countSummary = (type) => (v) => {
  const c = type.fields.filter((f) => String(v[f.key] ?? "").trim() !== "").length;
  return c ? `Wpisane parametry: ${c}` : "";
};

const C = {
  med: "Badania krwi i diagnostyka medyczna",
  body: "Skład ciała i waga",
  bio: "Biomechanika i prewencja urazów",
  psy: "Psychologiczne i kognitywne",
  other: "Inne",
};
export const CATEGORIES = Object.values(C);

const LAB_NOTE = " Jednostki przy polach są typowe dla polskich laboratoriów. Jeśli Twój wynik ma inne, przelicz je albo dopisz w notatce.";

const REACTION_KEYS = ["t1", "t2", "t3", "t4", "t5"];
const FMS_KEYS = ["squat", "hurdle", "lunge", "shoulder", "aslr", "pushup", "rotary"];

const TYPES = [
  // ───────── Badania krwi i diagnostyka medyczna ─────────
  {
    id: "blood_base",
    category: C.med,
    name: "Krew: morfologia i transport tlenu",
    short: "Morfologia, żelazo, ferrytyna, B12, kwas foliowy.",
    description: "Wykluczenie anemii sportowej i ocena zapasów żelaza, kluczowych dla wydolności." + LAB_NOTE,
    fields: [
      lab("hgb", "Hemoglobina", "g/dl"),
      lab("hct", "Hematokryt", "%"),
      lab("rbc", "Erytrocyty", "mln/µl", { digits: 2 }),
      lab("wbc", "Leukocyty", "tys./µl"),
      lab("plt", "Płytki krwi", "tys./µl", { step: 1 }),
      lab("iron", "Żelazo", "µg/dl"),
      lab("ferritin", "Ferrytyna", "ng/ml"),
      lab("transferrin", "Transferyna", "mg/dl"),
      lab("b12", "Witamina B12", "pg/ml"),
      lab("folate", "Kwas foliowy", "ng/ml"),
    ],
  },
  {
    id: "blood_recovery",
    category: C.med,
    name: "Krew: regeneracja i obciążenie",
    short: "CK, LDH, mocznik, kwas moczowy.",
    description: "Ocena stopnia mikrouszkodzeń mięśni oraz metabolizmu białek (przeciążenie treningowe)." + LAB_NOTE,
    fields: [
      lab("ck", "Kinaza kreatynowa (CK)", "U/l"),
      lab("ldh", "Dehydrogenaza mleczanowa (LDH)", "U/l"),
      lab("urea", "Mocznik", "mg/dl"),
      lab("uric", "Kwas moczowy", "mg/dl"),
    ],
  },
  {
    id: "blood_hormones",
    category: C.med,
    name: "Krew: gospodarka hormonalna",
    short: "Testosteron, kortyzol, TSH, fT3, fT4.",
    description: "Monitorowanie stanu anaboliczno-katabolicznego (stosunek T/C) i wykrywanie zespołu przetrenowania." + LAB_NOTE,
    fields: [
      lab("testo", "Testosteron całkowity", "ng/dl"),
      lab("ftesto", "Testosteron wolny", "pg/ml"),
      lab("cortisol", "Kortyzol", "µg/dl"),
      lab("tsh", "TSH", "µIU/ml", { digits: 2 }),
      lab("ft3", "fT3", "pg/ml", { digits: 2 }),
      lab("ft4", "fT4", "ng/dl", { digits: 2 }),
    ],
  },
  {
    id: "blood_inflammation",
    category: C.med,
    name: "Krew: stan zapalny i odporność",
    short: "CRP, OB, immunoglobuliny IgA i IgG.",
    description: "Wykrywanie utajonych stanów zapalnych i spadków odporności przed zawodami." + LAB_NOTE,
    fields: [
      lab("crp", "CRP (ultraczułe)", "mg/l", { digits: 2 }),
      lab("esr", "OB", "mm/h"),
      lab("iga", "IgA", "g/l", { digits: 2 }),
      lab("igg", "IgG", "g/l", { digits: 2 }),
    ],
  },
  {
    id: "blood_metabolism",
    category: C.med,
    name: "Krew: metabolizm i elektrolity",
    short: "Glukoza, insulina, lipidogram, elektrolity, witamina D3.",
    description: "Kontrola gospodarki energetycznej, kurczliwości mięśni i gęstości kości." + LAB_NOTE,
    fields: [
      lab("glucose", "Glukoza", "mg/dl"),
      lab("insulin", "Insulina", "µIU/ml"),
      lab("chol", "Cholesterol całkowity", "mg/dl"),
      lab("ldl", "LDL", "mg/dl"),
      lab("hdl", "HDL", "mg/dl"),
      lab("tg", "Trójglicerydy", "mg/dl"),
      lab("na", "Sód", "mmol/l"),
      lab("k", "Potas", "mmol/l", { digits: 2 }),
      lab("mg", "Magnez", "mmol/l", { digits: 2 }),
      lab("ca", "Wapń", "mmol/l", { digits: 2 }),
      lab("vitd", "Witamina D3 (25-OH)", "ng/ml"),
    ],
  },
  {
    id: "cardio",
    category: C.med,
    name: "Kardiologia sportowa",
    short: "EKG spoczynkowe, echo serca, próba wysiłkowa z EKG.",
    description: "Wykluczenie wad serca i ocena przerostu mięśnia sercowego (serce sportowca). Wpisz opis lub wniosek z badania.",
    fields: [
      { key: "ecg", label: "EKG spoczynkowe", type: "textarea" },
      { key: "echo", label: "Echo serca", type: "textarea" },
      { key: "stress", label: "Próba wysiłkowa z EKG", type: "textarea" },
    ],
    summary: (v) => {
      const done = [["ecg", "EKG"], ["echo", "echo serca"], ["stress", "próba wysiłkowa"]]
        .filter(([k]) => String(v[k] ?? "").trim() !== "")
        .map(([, name]) => name);
      return done.length ? `Wykonano: ${done.join(", ")}` : "";
    },
  },

  // ───────── Skład ciała i waga ─────────
  {
    id: "dexa",
    category: C.body,
    name: "DEXA (skład ciała i gęstość kości)",
    short: "Masa mięśniowa, tkanka tłuszczowa, BMD.",
    description: "Złoty standard pomiaru masy mięśniowej, tkanki tłuszczowej (w tym trzewnej) i gęstości mineralnej kości. Wykonywany 2–3 razy w roku. Tłuszcz trzewny wpisz w jednostce z wyniku badania.",
    fields: [
      lab("weight", "Masa ciała", "kg"),
      lab("fat", "Tkanka tłuszczowa", "%"),
      lab("lean", "Masa beztłuszczowa (mięśniowa)", "kg"),
      lab("visceral", "Tłuszcz trzewny", "", { digits: 2 }),
      lab("bmd", "Gęstość mineralna kości (BMD)", "g/cm²", { digits: 3 }),
    ],
    summary: (v) => parts(v, [["weight", "masa", "kg"], ["fat", "tłuszcz", "%"], ["lean", "beztłuszczowa", "kg"]]),
  },
  {
    id: "bia",
    category: C.body,
    name: "BIA i kalipometria",
    short: "Cotygodniowa kontrola wody i tłuszczu.",
    description: "Analiza impedancji bioelektrycznej (np. InBody, Tanita) i pomiar fałdów skórnych. Wykonywane co tydzień do kontroli wahań wody wewnątrz- i zewnątrzkomórkowej oraz masy tłuszczowej.",
    fields: [
      { key: "device", label: "Urządzenie", type: "text", meta: true },
      lab("weight", "Masa ciała", "kg"),
      lab("fatkg", "Masa tłuszczowa", "kg"),
      lab("fatpct", "Tkanka tłuszczowa", "%"),
      lab("icw", "Woda wewnątrzkomórkowa", "l"),
      lab("ecw", "Woda zewnątrzkomórkowa", "l"),
      lab("skinfold", "Suma fałdów skórnych", "mm"),
    ],
    summary: (v) => parts(v, [["weight", "masa", "kg"], ["fatpct", "tłuszcz", "%"], ["icw", "ICW", "l"], ["ecw", "ECW", "l"]]),
  },
  {
    id: "hydration",
    category: C.body,
    name: "Nawodnienie (mocz)",
    short: "Ciężar właściwy i osmolalność moczu, masa ciała.",
    description: "Codzienny monitoring nawodnienia w okresie redukcji wagi przed zawodami, aby uniknąć niebezpiecznego odwodnienia.",
    fields: [
      lab("weight", "Masa ciała", "kg"),
      lab("usg", "Ciężar właściwy moczu (USG)", "", { min: 1, max: 1.06, step: "0.001", digits: 3 }),
      lab("osm", "Osmolalność moczu", "mOsm/kg", { step: 1 }),
    ],
    summary: (v) => parts(v, [["weight", "masa", "kg"], ["usg", "USG", "", 3], ["osm", "osmolalność", "mOsm/kg", 0]]),
  },

  // ───────── Biomechanika i prewencja urazów ─────────
  {
    id: "isokinetic",
    category: C.bio,
    name: "Izokinetyka (Biodex)",
    short: "Siła antagonistów: uda i rotatory barku.",
    description: "Pomiar momentu siły mięśni antagonistycznych. Stosunki H:Q (dwugłowy do czworogłowego uda) i rotatorów zewnętrznych do wewnętrznych barku liczą się same.",
    fields: [
      { key: "side", label: "Strona", type: "choice", options: ["Prawa", "Lewa"], meta: true },
      lab("quad", "Mięsień czworogłowy uda", "Nm"),
      lab("ham", "Mięśnie dwugłowe uda", "Nm"),
      lab("er", "Rotatory zewnętrzne barku", "Nm"),
      lab("ir", "Rotatory wewnętrzne barku", "Nm"),
    ],
    summary: (v) => {
      const q = n(v.quad), h = n(v.ham), er = n(v.er), ir = n(v.ir);
      const p = [];
      if (q > 0 && h !== null) p.push(`H:Q ${fmt(h / q, 2)}`);
      if (ir > 0 && er !== null) p.push(`rotatory zew.:wew. ${fmt(er / ir, 2)}`);
      return (v.side ? v.side + ": " : "") + p.join(", ");
    },
  },
  {
    id: "fms",
    category: C.bio,
    name: "Functional Movement Screen (FMS)",
    short: "Siedem wzorców ruchu, każdy oceniany 0–3.",
    description: "Ocena asymetrii ruchowych, stabilizacji centralnej (core) i mobilności. Wpisz ocenę 0–3 dla każdego wzorca (przy ruchach obustronnych niższą z dwóch stron).",
    fields: [
      lab("squat", "Głęboki przysiad", "", { max: 3, step: 1 }),
      lab("hurdle", "Przekrok przez płotek", "", { max: 3, step: 1 }),
      lab("lunge", "Wykrok w linii", "", { max: 3, step: 1 }),
      lab("shoulder", "Mobilność barków", "", { max: 3, step: 1 }),
      lab("aslr", "Aktywne unoszenie wyprostowanej nogi", "", { max: 3, step: 1 }),
      lab("pushup", "Pompka ze stabilizacją tułowia", "", { max: 3, step: 1 }),
      lab("rotary", "Stabilność rotacyjna", "", { max: 3, step: 1 }),
    ],
    summary: (v) => {
      const t = nums(v, FMS_KEYS);
      return t.length ? `Suma: ${fmt(sum(t), 0)}/21${t.length < 7 ? ` (wpisano ${t.length} z 7)` : ""}` : "";
    },
  },
  {
    id: "ybt",
    category: C.bio,
    name: "Y-Balance Test",
    short: "Zasięgi w trzech kierunkach, prawa i lewa noga.",
    description: "Ocena równowagi i asymetrii. Wynik złożony to suma trzech zasięgów dzielona przez trzykrotną długość kończyny, w procentach.",
    fields: [
      lab("leg", "Długość kończyny", "cm"),
      lab("rA", "Prawa: przód", "cm"),
      lab("rPM", "Prawa: tyłem do wewnątrz", "cm"),
      lab("rPL", "Prawa: tyłem na zewnątrz", "cm"),
      lab("lA", "Lewa: przód", "cm"),
      lab("lPM", "Lewa: tyłem do wewnątrz", "cm"),
      lab("lPL", "Lewa: tyłem na zewnątrz", "cm"),
    ],
    summary: (v) => {
      const leg = n(v.leg);
      const comp = (keys) => {
        const r = nums(v, keys);
        return leg > 0 && r.length === 3 ? (sum(r) / (3 * leg)) * 100 : null;
      };
      const p = [];
      const r = comp(["rA", "rPM", "rPL"]);
      const l = comp(["lA", "lPM", "lPL"]);
      if (r !== null) p.push(`prawa ${fmt(r)}%`);
      if (l !== null) p.push(`lewa ${fmt(l)}%`);
      if (n(v.rA) !== null && n(v.lA) !== null) p.push(`różnica przód ${fmt(Math.abs(n(v.rA) - n(v.lA)))} cm`);
      return p.join(", ");
    },
  },
  {
    id: "video",
    category: C.bio,
    name: "Analiza wideo techniki",
    short: "Czas wejścia, kąt wychylenia rywala, uwagi.",
    description: "Analiza biomechaniczna koronnej techniki (tokui-waza) w 3D lub slow-motion, prowadzona z trenerem i biomechanikiem.",
    fields: [
      { key: "technique", label: "Technika", type: "text", meta: true },
      lab("entry", "Czas wejścia", "ms", { step: 1 }),
      lab("angle", "Kąt wychylenia rywala", "°"),
      { key: "com", label: "Środek ciężkości", type: "textarea" },
      { key: "remarks", label: "Uwagi trenera i biomechanika", type: "textarea" },
    ],
    summary: (v) => [v.technique, parts(v, [["entry", "wejście", "ms", 0], ["angle", "kąt", "°", 0]])].filter(Boolean).join(": "),
  },

  // ───────── Psychologiczne i kognitywne ─────────
  {
    id: "reaction",
    category: C.psy,
    name: "Czas reakcji i koordynacja (Batak, Fitlight)",
    short: "Szybkość decyzji i reakcji, kilka prób w ms.",
    description: "Ocena szybkości podejmowania decyzji pod presją zmęczenia i bodźców rozpraszających. Niższy czas oznacza lepszy wynik.",
    fields: [
      { key: "system", label: "System (np. Batak, Fitlight)", type: "text", meta: true },
      ...REACTION_KEYS.map((key, i) => lab(key, `Próba ${i + 1}`, "ms")),
      lab("hits", "Liczba trafień (opcjonalnie)", "", { step: 1 }),
    ],
    summary: (v) => {
      const t = nums(v, REACTION_KEYS);
      const hits = n(v.hits);
      const p = [];
      if (t.length) p.push(`średnia ${fmt(avg(t))} ms, najlepsza ${fmt(Math.min(...t))} ms`);
      if (hits !== null) p.push(`trafienia ${fmt(hits, 0)}`);
      return p.join(", ");
    },
  },
  {
    id: "poms",
    category: C.psy,
    name: "POMS (profil nastroju)",
    short: "Sześć skal nastroju i wskaźnik zaburzeń nastroju.",
    description: "Profile of Mood States: monitorowanie zmęczenia psychicznego i nastroju. Wpisz wyniki sześciu skal. Całkowite zaburzenie nastroju (TMD) = napięcie + depresja + gniew + zmęczenie + dezorientacja − wigor.",
    fields: [
      lab("tension", "Napięcie", "", { step: 1 }),
      lab("depression", "Depresja", "", { step: 1 }),
      lab("anger", "Gniew", "", { step: 1 }),
      lab("vigor", "Wigor", "", { step: 1 }),
      lab("fatigue", "Zmęczenie", "", { step: 1 }),
      lab("confusion", "Dezorientacja", "", { step: 1 }),
    ],
    summary: (v) => {
      const neg = nums(v, ["tension", "depression", "anger", "fatigue", "confusion"]);
      const vigor = n(v.vigor);
      return neg.length === 5 && vigor !== null ? `TMD: ${fmt(sum(neg) - vigor, 0)}` : "";
    },
  },
  {
    id: "csai",
    category: C.psy,
    name: "CSAI-2 (lęk przedstartowy)",
    short: "Lęk poznawczy, somatyczny i pewność siebie.",
    description: "Competitive State Anxiety Inventory-2: poziom lęku przedstartowego i pewności siebie. Każda z trzech podskal to wynik od 9 do 36.",
    fields: [
      lab("cognitive", "Lęk poznawczy", "", { min: 9, max: 36, step: 1 }),
      lab("somatic", "Lęk somatyczny", "", { min: 9, max: 36, step: 1 }),
      lab("confidence", "Pewność siebie", "", { min: 9, max: 36, step: 1 }),
    ],
    summary: (v) => parts(v, [["cognitive", "poznawczy", "", 0], ["somatic", "somatyczny", "", 0], ["confidence", "pewność", "", 0]]),
  },
  {
    id: "hrv",
    category: C.psy,
    name: "HRV (poranny pomiar)",
    short: "Gotowość układu nerwowego do treningu.",
    description: "Codzienny poranny pomiar zmienności rytmu zatokowego (aplikacją lub opaską) do oceny gotowości do ciężkiego treningu.",
    fields: [
      { key: "device", label: "Urządzenie lub aplikacja", type: "text", meta: true },
      lab("rmssd", "RMSSD", "ms"),
      lab("hr", "Tętno spoczynkowe", "uderzeń/min", { step: 1 }),
      lab("score", "Wskaźnik gotowości z aplikacji", ""),
    ],
    summary: (v) => parts(v, [["rmssd", "RMSSD", "ms"], ["hr", "tętno", "", 0], ["score", "gotowość", ""]]),
  },
  {
    id: "readiness",
    category: C.psy,
    name: "Gotowość psychiczna (samoocena)",
    short: "Samoocena w skali 1–10 przed treningiem lub walką.",
    description: "Oceń swój stan psychiczny w skali od 1 do 10.",
    fields: [
      { key: "confidence", label: "Pewność siebie", type: "scale" },
      { key: "motivation", label: "Motywacja", type: "scale" },
      { key: "focus", label: "Koncentracja", type: "scale" },
      { key: "stress", label: "Poziom stresu", type: "scale", hint: "1 = brak stresu, 10 = bardzo duży stres" },
    ],
    summary: (v) => {
      const pos = nums(v, ["confidence", "motivation", "focus"]);
      const stress = n(v.stress);
      const p = [];
      if (pos.length) p.push(`gotowość ${fmt(avg(pos))}/10`);
      if (stress !== null) p.push(`stres ${fmt(stress, 0)}/10`);
      return p.join(", ");
    },
  },

  // ───────── Inne ─────────
  {
    id: "custom",
    category: C.other,
    name: "Własny test",
    short: "Wpisz nazwę, wynik i jednostkę.",
    description: "Dowolny test, którego nie ma na liście.",
    fields: [
      { key: "name", label: "Nazwa testu", type: "text", required: true, meta: true },
      { key: "value", label: "Wynik", type: "number", required: true },
      { key: "unit", label: "Jednostka", type: "text", meta: true },
    ],
    summary: (v) => {
      const x = n(v.value);
      return x === null ? "" : `${v.name ? v.name + ": " : ""}${fmt(x, 2)}${v.unit ? " " + v.unit : ""}`;
    },
  },
];

// Testy bez własnego podsumowania dostają licznik wpisanych parametrów.
export const TEST_TYPES = TYPES.map((t) => (t.summary ? t : { ...t, summary: countSummary(t) }));

export const getType = (id) => TEST_TYPES.find((t) => t.id === id);
export const summarize = (type, values) => (type.summary ? type.summary(values) : "");

export function fieldDisplay(field, value) {
  if (field.type === "number") {
    const x = n(value);
    return x === null ? String(value) : `${fmt(x, field.digits ?? 2)}${field.unit ? " " + field.unit : ""}`;
  }
  if (field.type === "scale") return `${value}/10`;
  return String(value);
}