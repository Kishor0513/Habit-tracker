import React, { useEffect, useMemo, useState } from "react";
import { isoToday } from "../lib/date.js";
import { isDueOn, entryMeetsTarget } from "../lib/habits.js";
import { completionRateLastNDays, currentStreak } from "../lib/stats.js";
import { useApp } from "../state/AppState.jsx";
import EmptyState from "../components/EmptyState.jsx";

function fmtPct(x) {
  return `${Math.round(x * 100)}%`;
}

function Sparkline({ points, width = 260, height = 56 }) {
  const max = Math.max(...points, 1);
  const step = width / Math.max(points.length - 1, 1);
  const coords = points.map((p, i) => {
    const x = i * step;
    const y = height - (p / max) * height;
    return [x, y];
  });
  const d = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Trend">
      <path d={d} fill="none" stroke="rgba(124,92,255,0.9)" strokeWidth="3" strokeLinecap="round" />
      <path d={`${d} L ${width} ${height} L 0 ${height} Z`} fill="rgba(124,92,255,0.14)" />
    </svg>
  );
}

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
    return () => {
      alive = false;
    };
  }, [api, dataVersion]);

  const overall14 = useMemo(() => completionRateLastNDays(habits, entriesByKey, 14), [habits, entriesByKey]);
  const overall30 = useMemo(() => completionRateLastNDays(habits, entriesByKey, 30), [habits, entriesByKey]);

  const dailyRate = useMemo(() => {
    const rate = [];
    for (const day of overall30.days) {
      let due = 0;
      let done = 0;
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

  if (!isReady) return <div className="card">Loading…</div>;

  if (habits.length === 0) {
    return <EmptyState title="No data yet" body="Add habits or load example packs to see insights." action={<a className="btn" href="#/settings">Open Settings</a>} />;
  }

  return (
    <div className="grid two">
      <div className="stack">
        <div className="card">
          <h2>Insights</h2>
          <div className="kpiGrid">
            <div className="kpi">
              <div className="label">14-day completion</div>
              <div className="value">{fmtPct(overall14.rate)}</div>
            </div>
            <div className="kpi">
              <div className="label">30-day completion</div>
              <div className="value">{fmtPct(overall30.rate)}</div>
            </div>
            <div className="kpi">
              <div className="label">Active habits</div>
              <div className="value">{habits.length}</div>
            </div>
          </div>
        </div>
        <div className="card">
          <h2>30-day trend</h2>
          <div className="subtle">If this line is flat, simplify habits. If it’s rising, scale targets slowly.</div>
          <div style={{ marginTop: 10 }}>
            <Sparkline points={dailyRate.map((x) => Math.round(x * 100))} />
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Habit streaks</h2>
        <div className="list">
          {habits.map((h) => {
            const streak = currentStreak(h, entriesByKey, isoToday());
            const stats = completionRateLastNDays([h], entriesByKey, 30);
            return (
              <div key={h.id} className="item">
                <div className="row between">
                  <div className="row" style={{ gap: 10, minWidth: 0 }}>
                    <div className="dot" style={{ background: h.color, boxShadow: `0 0 0 4px ${h.color}22` }} />
                    <div className="itemName">{h.name}</div>
                  </div>
                  <span className="badge">streak {streak}</span>
                </div>
                <div className="subtle" style={{ marginTop: 6 }}>
                  30-day completion: {Math.round(stats.rate * 100)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

