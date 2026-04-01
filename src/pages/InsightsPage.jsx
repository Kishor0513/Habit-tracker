import React, { useEffect, useMemo, useState } from "react";
import { isoToday } from "../lib/date.js";
import { isDueOn, entryMeetsTarget } from "../lib/habits.js";
import { completionRateLastNDays, currentStreak } from "../lib/stats.js";
import { useApp } from "../state/AppState.jsx";
import EmptyState from "../components/EmptyState.jsx";

function fmtPct(x) {
  return `${Math.round(x * 100)}%`;
}

// ─── Enhanced Sparkline ───────────────────────────────────────────────────────
function Sparkline({ points, width = 280, height = 64 }) {
  const max = Math.max(...points, 1);
  const step = width / Math.max(points.length - 1, 1);
  const coords = points.map((p, i) => {
    const x = i * step;
    const y = height - (p / max) * (height - 8) - 4;
    return [x, y];
  });
  const d = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const fillD = `${d} L ${width} ${height} L 0 ${height} Z`;
  const gradId = "sparkGrad";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="30-day completion trend"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#${gradId})`} />
      <path
        d={d}
        fill="none"
        stroke="var(--brand-mid)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dots on key points */}
      {coords
        .filter((_, i) => i === 0 || i === coords.length - 1)
        .map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="4"
            fill="var(--brand)"
            stroke="var(--bg-2)"
            strokeWidth="2"
          />
        ))}
    </svg>
  );
}

// ─── Insights Page ────────────────────────────────────────────────────────────
export default function InsightsPage() {
  const { api, isReady, dataVersion } = useApp();
  const [habits, setHabits] = useState([]);
  const [entriesByKey, setEntriesByKey] = useState(new Map());

  useEffect(() => {
    if (!api) return;
    let alive = true;
    Promise.all([api.listHabits(), api.listEntries()])
      .then(([h, e]) => {
        if (!alive) return;
        setHabits(h.filter((x) => !x.archivedAt));
        setEntriesByKey(new Map(e.map((x) => [x.id, x])));
      })
      .catch((err) => console.error(err));
    return () => { alive = false; };
  }, [api, dataVersion]);

  const overall14 = useMemo(() => completionRateLastNDays(habits, entriesByKey, 14), [habits, entriesByKey]);
  const overall30 = useMemo(() => completionRateLastNDays(habits, entriesByKey, 30), [habits, entriesByKey]);

  const dailyRate = useMemo(() => {
    const rate = [];
    for (const day of overall30.days) {
      let due = 0, done = 0;
      for (const habit of habits) {
        if (!isDueOn(habit, day)) continue;
        due += 1;
        const entry = entriesByKey.get(`${habit.id}__${day}`);
        if (entryMeetsTarget(habit, entry)) done += 1;
      }
      rate.push(due === 0 ? 0 : done / due);
    }
    return rate;
  }, [overall30.days, habits, entriesByKey]);

  if (!isReady) return <div className="card"><p className="subtle">Loading…</p></div>;

  if (habits.length === 0) {
    return (
      <EmptyState
        title="No data yet"
        body="Add habits or load example packs to see insights."
        action={<a className="btn" href="#/settings">Open Settings</a>}
      />
    );
  }

  // Rate badge class helper
  const rateBadge = (rate) => {
    const pct = rate * 100;
    return pct >= 80 ? "badge success" : pct >= 50 ? "badge warning" : "badge danger";
  };

  return (
    <div className="grid two">
      <div className="stack">
        {/* KPI overview */}
        <div className="card">
          <div className="sectionHeader">
            <h2>Insights</h2>
            <span className="badge accent">Last 30 days</span>
          </div>
          <div className="kpiGrid">
            <div className="kpi">
              <div className="label">14-day</div>
              <div className="value">{fmtPct(overall14.rate)}</div>
            </div>
            <div className="kpi">
              <div className="label">30-day</div>
              <div className="value">{fmtPct(overall30.rate)}</div>
            </div>
            <div className="kpi">
              <div className="label">Active</div>
              <div className="value">{habits.length}</div>
            </div>
          </div>
        </div>

        {/* 30-day trend chart */}
        <div className="card">
          <div className="sectionHeader">
            <h2>30-day trend</h2>
            <span className={rateBadge(overall30.rate)}>{fmtPct(overall30.rate)}</span>
          </div>
          <p className="subtle">If this line is flat, simplify habits. If it's rising, scale targets slowly.</p>
          <div className="sparkline-wrap" style={{ marginTop: 4 }}>
            <Sparkline points={dailyRate.map((x) => Math.round(x * 100))} />
          </div>
        </div>
      </div>

      {/* Habit streaks */}
      <div className="card">
        <h2>Habit streaks</h2>
        <div className="list">
          {habits.map((h) => {
            const streak = currentStreak(h, entriesByKey, isoToday());
            const stats = completionRateLastNDays([h], entriesByKey, 30);
            const pct = Math.round(stats.rate * 100);
            const streakClass = streak >= 7 ? "badge success" : streak >= 3 ? "badge warning" : "badge";

            return (
              <div key={h.id} className="item">
                <div className="row between">
                  <div className="row" style={{ gap: 10, minWidth: 0 }}>
                    <div
                      className="dot"
                      style={{
                        background: h.color,
                        boxShadow: `0 0 0 3px ${h.color}30`,
                        width: 12, height: 12,
                      }}
                    />
                    <div className="itemName">{h.name}</div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <span className={rateBadge(stats.rate)}>{pct}%</span>
                    <span className={streakClass}>
                      {streak > 0 ? `🔥 ${streak}` : "—"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
