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
        setEntriesByKey(new Map(e.map((x) => [`${x.habitId}__${x.date}`, x])));
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

  // Generate 12-month heatmap data
  const heatmapData = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      let count = 0;
      for (const h of habits) {
        if (entriesByKey.has(`${h.id}__${iso}`)) count++;
      }
      days.push({ iso, count });
    }
    return days;
  }, [habits, entriesByKey]);

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

  const rateBadge = (rate) => {
    const pct = rate * 100;
    return pct >= 80 ? "badge success" : pct >= 50 ? "badge warning" : "badge danger";
  };

  return (
    <div className="bento">
      {/* Year View Heatmap */}
      <div className="span-12 stack">
        <div className="card" style={{ background: 'var(--surface-container)', border: 'none' }}>
          <div className="sectionHeader">
             <div className="stack" style={{ gap: 4 }}>
              <span className="greeting">Consistency</span>
              <h2>Year in preview</h2>
             </div>
             <span className="badge accent">365 Days</span>
          </div>
          <div className="heatmap" style={{ gap: 4, marginTop: 16 }}>
            {heatmapData.map((cell, idx) => {
              const level = cell.count === 0 ? '' : cell.count >= 4 ? 'level-4' : cell.count >= 2 ? 'level-2' : 'level-1';
              return <div key={idx} className={`heatCell ${level}`} title={`${cell.iso}: ${cell.count} habits`} style={{ width: 12, height: 12 }} />;
            })}
          </div>
          <div className="row" style={{ marginTop: 12, justifyContent: 'flex-end', gap: 12 }}>
            <div className="row" style={{ gap: 4 }}>
              <div className="heatCell" style={{ width: 10, height: 10 }} />
              <span className="subtle" style={{ fontSize: '10px' }}>None</span>
            </div>
            <div className="row" style={{ gap: 4 }}>
              <div className="heatCell level-1" style={{ width: 10, height: 10 }} />
              <span className="subtle" style={{ fontSize: '10px' }}>Some</span>
            </div>
            <div className="row" style={{ gap: 4 }}>
              <div className="heatCell level-4" style={{ width: 10, height: 10 }} />
              <span className="subtle" style={{ fontSize: '10px' }}>Peak</span>
            </div>
          </div>
        </div>
      </div>

      <div className="span-8 stack">
        {/* KPI overview */}
        <div className="card">
          <div className="sectionHeader">
            <h2>Momentum Control</h2>
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
              <div className="label">System Load</div>
              <div className="value" style={{ fontSize: '1.2rem' }}>{habits.length} Habits</div>
            </div>
          </div>
        </div>

        {/* 30-day trend chart */}
        <div className="card">
          <div className="sectionHeader">
            <h2>Trend Analysis</h2>
            <span className={rateBadge(overall30.rate)}>{fmtPct(overall30.rate)}</span>
          </div>
          <div className="sparkline-wrap" style={{ marginTop: 12 }}>
            <Sparkline points={dailyRate.map((x) => Math.round(x * 100))} />
          </div>
          <p className="subtle" style={{ marginTop: 12 }}>Rising trend indicates successful baseline integration. Flat or falling lines suggest habit overload.</p>
        </div>
      </div>

      {/* Habit streaks */}
      <div className="span-4 stack">
        <div className="card" style={{ height: '100%' }}>
          <h2>Stability index</h2>
          <div className="list" style={{ marginTop: 12 }}>
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
                          width: 10, height: 10,
                        }}
                      />
                      <div className="itemName" style={{ fontSize: '0.85rem' }}>{h.name}</div>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <span className={streakClass} style={{ fontSize: '9px' }}>
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
    </div>
  );
}
