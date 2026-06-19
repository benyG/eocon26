"use client";
import { useMemo, useState } from "react";

type Row = Record<string, unknown>;
type Period = "week" | "month" | "3months";
type Dim = "ticketType" | "status";

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "Semaine en cours" },
  { key: "month", label: "Mois en cours" },
  { key: "3months", label: "3 derniers mois" },
];

const DIMS: { key: Dim; label: string }[] = [
  { key: "ticketType", label: "Par type" },
  { key: "status", label: "Par statut" },
];

// Cyberpunk-friendly palette for the series.
const PALETTE = ["#00ff9d", "#00d4ff", "#ff0066", "#ffaa00", "#b14aed", "#ff5e00", "#00ffd0", "#ff3df0"];

function periodStart(period: Period): Date {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "week") {
    const dow = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - dow);
  } else if (period === "month") {
    d.setDate(1);
  } else {
    d.setMonth(d.getMonth() - 3);
  }
  return d;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function RegistrationsChart({ rows }: { rows: Row[] }) {
  const [period, setPeriod] = useState<Period>("month");
  const [dim, setDim] = useState<Dim>("ticketType");

  const chart = useMemo(() => {
    const start = periodStart(period);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    // Build the list of days in the window.
    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));

    // Distinct series values present in the data (stable order).
    const seriesValues = Array.from(
      new Set(rows.map(r => (r[dim] as string) || "—").filter(Boolean))
    ).sort();

    // Baseline = registrations before the window (so the curve shows true running totals),
    // and per-day new counts inside the window.
    const baseline: Record<string, number> = {};
    const perDay: Record<string, Record<string, number>> = {}; // value -> dayKey -> count
    for (const v of seriesValues) { baseline[v] = 0; perDay[v] = {}; }

    let newInWindow = 0;
    for (const r of rows) {
      const created = r.createdAt ? new Date(r.createdAt as string) : null;
      if (!created || isNaN(created.getTime())) continue;
      const v = (r[dim] as string) || "—";
      if (!(v in baseline)) { baseline[v] = 0; perDay[v] = {}; seriesValues.push(v); }
      if (created < start) { baseline[v]++; continue; }
      if (created > end) continue;
      const k = dayKey(created);
      perDay[v][k] = (perDay[v][k] || 0) + 1;
      newInWindow++;
    }

    // Cumulative running total per series across the window's days.
    const series = seriesValues.map((v, i) => {
      let run = baseline[v];
      const points = days.map(d => {
        run += perDay[v][dayKey(d)] || 0;
        return run;
      });
      return { value: v, color: PALETTE[i % PALETTE.length], points, total: run };
    });

    const yMax = Math.max(1, ...series.flatMap(s => s.points));
    return { days, series, yMax, newInWindow, start, end };
  }, [rows, period, dim]);

  const { days, series, yMax, newInWindow } = chart;

  // SVG geometry.
  const W = 760, H = 280, padL = 38, padR = 12, padT = 16, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const x = (i: number) => padL + (days.length <= 1 ? plotW / 2 : (i / (days.length - 1)) * plotW);
  const y = (v: number) => padT + plotH - (v / yMax) * plotH;

  // Up to ~6 evenly spaced x-axis labels.
  const labelStep = Math.max(1, Math.ceil(days.length / 6));
  const yTicks = 4;

  return (
    <div className="cyber-card rounded-xl p-5 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">📈 Évolution des inscriptions</h3>
          <p className="text-gray-600 text-xs mt-0.5">{newInWindow} nouvelle(s) inscription(s) sur la période</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded border border-gray-800 overflow-hidden">
            {DIMS.map(dd => (
              <button key={dd.key} onClick={() => setDim(dd.key)}
                className={`text-xs px-3 py-1.5 transition-colors ${dim === dd.key ? "bg-neon-green/15 text-neon-green" : "text-gray-500 hover:text-white"}`}>
                {dd.label}
              </button>
            ))}
          </div>
          <div className="flex rounded border border-gray-800 overflow-hidden">
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`text-xs px-3 py-1.5 transition-colors ${period === p.key ? "bg-neon-green/15 text-neon-green" : "text-gray-500 hover:text-white"}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {series.length === 0 || days.length === 0 ? (
        <p className="text-gray-600 text-xs py-12 text-center">Aucune donnée sur cette période</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 300 }}>
            {/* Y grid + labels */}
            {Array.from({ length: yTicks + 1 }, (_, i) => {
              const val = Math.round((yMax / yTicks) * i);
              const yy = y(val);
              return (
                <g key={i}>
                  <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="#ffffff10" strokeWidth={1} />
                  <text x={padL - 6} y={yy + 3} textAnchor="end" fontSize={9} fill="#666" fontFamily="monospace">{val}</text>
                </g>
              );
            })}
            {/* X labels */}
            {days.map((d, i) => (i % labelStep === 0 || i === days.length - 1) ? (
              <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={9} fill="#666" fontFamily="monospace">
                {d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
              </text>
            ) : null)}
            {/* Series lines */}
            {series.map(s => {
              const path = s.points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(" ");
              return (
                <g key={s.value}>
                  <path d={path} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  {days.length <= 31 && s.points.map((p, i) => (
                    <circle key={i} cx={x(i)} cy={y(p)} r={2} fill={s.color} />
                  ))}
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
            {series.map(s => (
              <div key={s.value} className="flex items-center gap-1.5 text-xs">
                <span className="w-3 h-0.5 rounded" style={{ background: s.color }} />
                <span className="text-gray-400">{s.value}</span>
                <span className="font-mono" style={{ color: s.color }}>{s.total}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
