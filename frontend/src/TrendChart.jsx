// Prosty wykres liniowy w SVG. series: [{ label, kind: "main" | "avg" | "alt", values: [liczba | null] }],
// gdzie values ma tyle elementów, ile days (daty w formacie RRRR-MM-DD).
const W = 640;
const H = 200;
const PL = 46;
const PR = 14;
const PT = 14;
const PB = 30;

const short = (d) => `${d.slice(8)}.${d.slice(5, 7)}`;

export default function TrendChart({ title, days, series, digits = 0 }) {
  const all = series.flatMap((s) => s.values).filter((v) => v != null);
  const fmt = (v) => v.toLocaleString("pl-PL", { maximumFractionDigits: digits });

  let min = Math.min(...all);
  let max = Math.max(...all);
  if (all.length) {
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const pad = (max - min) * 0.15;
    min = Math.max(0, min - pad);
    max += pad;
  }
  const x = (i) => PL + (days.length === 1 ? (W - PL - PR) / 2 : (i / (days.length - 1)) * (W - PL - PR));
  const y = (v) => PT + (1 - (v - min) / (max - min)) * (H - PT - PB);
  const points = (values) => values.map((v, i) => (v == null ? null : [x(i), y(v)])).filter(Boolean);

  const main = series.find((s) => s.kind === "main");
  const last = main ? [...main.values].reverse().find((v) => v != null) : null;

  return (
    <figure className="chart">
      <figcaption>{title}</figcaption>
      {all.length === 0 ? (
        <p className="muted">Brak danych w tym okresie.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: ${all.length} pomiarów, ostatni ${last != null ? fmt(last) : "brak"}`}>
          <line className="grid" x1={PL} x2={W - PR} y1={y(min)} y2={y(min)} />
          <line className="grid" x1={PL} x2={W - PR} y1={y(max)} y2={y(max)} />
          <text x={PL - 6} y={y(max) + 4} textAnchor="end">{fmt(max)}</text>
          <text x={PL - 6} y={y(min) + 4} textAnchor="end">{fmt(min)}</text>
          <text x={PL} y={H - 8} textAnchor="start">{short(days[0])}</text>
          <text x={W - PR} y={H - 8} textAnchor="end">{short(days[days.length - 1])}</text>
          {series.map((s) => {
            const pts = points(s.values);
            return (
              <g key={s.label}>
                {pts.length > 1 && <polyline className={`line ${s.kind}`} points={pts.map((p) => p.join(",")).join(" ")} />}
                {s.kind !== "avg" && pts.map((p, i) => <circle key={i} className={`pt ${s.kind}`} cx={p[0]} cy={p[1]} r="3.5" />)}
              </g>
            );
          })}
        </svg>
      )}
      <div className="chartlegend">
        {series.map((s) => (
          <span key={s.label}><i className={`dot ${s.kind}`} />{s.label}</span>
        ))}
      </div>
    </figure>
  );
}
