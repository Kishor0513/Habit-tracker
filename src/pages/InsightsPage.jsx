import React, { useEffect, useMemo, useState } from "react";
import { isoToday, lastNDays } from "../lib/date.js";
import { isDueOn, entryMeetsTarget, habitEntryStatus, EntryStatus } from "../lib/habits.js";
import { completionRateLastNDays, currentStreak, weeklyGoalProgress } from "../lib/stats.js";
import { useApp } from "../state/AppState.jsx";
import EmptyState from "../components/EmptyState.jsx";

function fmtPct(x) {
  return `${Math.round(x * 100)}%`;
}

function Sparkline({ points, width = 280, height = 64 }) {
  const max = Math.max(...points, 1);
  const step = width / Math.max(points.length - 1, 1);
  const coords = points.map((p, i) => {
    const x = i * step;
    const y = height - (p / max) * (height - 8) - 4;
    return [x, y];
  });
  const d = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const fillD = `${d} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="30-day completion trend" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill="url(#sparkGrad)" />
      <path d={d} fill="none" stroke="var(--brand-mid)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
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

  const heatmapData = useMemo(() => {
    return lastNDays(42).map((iso) => {
      let done = 0;
      let skipped = 0;
      for (const h of habits) {
        const entry = entriesByKey.get(`${h.id}__${iso}`);
        if (entryMeetsTarget(h, entry)) done += 1;
        if (habitEntryStatus(h, entry) === EntryStatus.skipped) skipped += 1;
      }
      return { iso, done, skipped };
    });
  }, [habits, entriesByKey]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map();
    for (const habit of habits) {
      const key = habit.category || "Uncategorized";
      const current = map.get(key) ?? { category: key, habits: 0, completion: 0 };
      const stats = completionRateLastNDays([habit], entriesByKey, 30);
      current.habits += 1;
      current.completion += stats.rate;
      map.set(key, current);
    }
    return [...map.values()]
      .map((item) => ({ ...item, completion: item.habits === 0 ? 0 : item.completion / item.habits }))
      .sort((a, b) => b.completion - a.completion);
  }, [habits, entriesByKey]);

  const recoveryMetrics = useMemo(() => {
    let skipped = 0;
    let protectedSkips = 0;
    for (const habit of habits) {
      for (const day of lastNDays(30)) {
        const entry = entriesByKey.get(`${habit.id}__${day}`);
        if (habitEntryStatus(habit, entry) !== EntryStatus.skipped) continue;
        skipped += 1;
        if (habit.skipRule === "protect") protectedSkips += 1;
      }
    }
    return { skipped, protectedSkips };
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

  return (
    <div className="bento">
      <div className="span-12 stack">
        <div className="card" style={{ background: 'var(--surface-container)', border: 'none' }}>
          <div className="sectionHeader">
            <div className="stack" style={{ gap: 4 }}>
              <span className="greeting">History</span>
              <h2>Last 6 weeks</h2>
            </div>
            <span className="badge accent">Calendar view</span>
          </div>
          <div className="heatmap" style={{ gap: 4, marginTop: 16 }}>
            {heatmapData.map((cell) => {
              const level = cell.done === 0 ? '' : cell.done >= 4 ? 'level-4' : cell.done >= 2 ? 'level-2' : 'level-1';
              return (
                <div
                  key={cell.iso}
                  className={`heatCell ${level}`}
                  title={`${cell.iso}: ${cell.done} completed, ${cell.skipped} skipped`}
                  style={{
                    width: 14,
                    height: 14,
                    outline: cell.skipped > 0 ? '1px solid rgba(249,115,22,0.55)' : 'none',
                    outlineOffset: 1,
                  }}
                />
              );
            })}
          </div>
          <div className="row" style={{ marginTop: 12, justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div className="subtle">Orange outline indicates skipped activity on that day.</div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <span className="badge">{recoveryMetrics.skipped} skips / 30d</span>
              <span className="badge success">{recoveryMetrics.protectedSkips} protected</span>
            </div>
          </div>
        </div>
      </div>

      <div className="span-8 stack">
        <div className="card">
          <div className="sectionHeader">
            <h2>Momentum control</h2>
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
              <div className="label">Active habits</div>
              <div className="value" style={{ fontSize: '1.2rem' }}>{habits.length}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="sectionHeader">
            <h2>Trend analysis</h2>
            <span className="badge">{fmtPct(overall30.rate)}</span>
          </div>
          <div className="sparkline-wrap" style={{ marginTop: 12 }}>
            <Sparkline points={dailyRate.map((x) => Math.round(x * 100))} />
          </div>
          <p className="subtle" style={{ marginTop: 12 }}>
            Rising trend means your system is getting easier to execute. Falling trend usually means too much friction or too many active habits.
          </p>
        </div>

        <div className="card">
          <div className="sectionHeader">
            <h2>Category performance</h2>
            <span className="badge brand">{categoryBreakdown.length} groups</span>
          </div>
          <div className="list" style={{ marginTop: 12 }}>
            {categoryBreakdown.map((item) => (
              <div key={item.category} className="item">
                <div className="row between" style={{ gap: 12 }}>
                  <div className="itemName">{item.category}</div>
                  <div className="row" style={{ gap: 8 }}>
                    <span className="badge">{item.habits} habits</span>
                    <span className={item.completion >= 0.8 ? "badge success" : item.completion >= 0.5 ? "badge warning" : "badge danger"}>
                      {fmtPct(item.completion)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="span-4 stack">
        <div className="card">
          <h2>Stability index</h2>
          <div className="list" style={{ marginTop: 12 }}>
            {habits.map((h) => {
              const streak = currentStreak(h, entriesByKey, isoToday());
              const weeklyGoal = weeklyGoalProgress(h, entriesByKey);
              return (
                <div key={h.id} className="item">
                  <div className="row between" style={{ gap: 10 }}>
                    <div className="stack" style={{ gap: 6, minWidth: 0 }}>
                      <div className="row" style={{ gap: 10, minWidth: 0 }}>
                        <div className="dot" style={{ background: h.color, width: 10, height: 10 }} />
                        <div className="itemName" style={{ fontSize: '0.85rem' }}>{h.name}</div>
                      </div>
                      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                        {h.category ? <span className="badge">{h.category}</span> : null}
                        {weeklyGoal.target > 0 ? (
                          <span className={weeklyGoal.met ? "badge success" : "badge warning"}>
                            {weeklyGoal.completions}/{weeklyGoal.target} week
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <span className={streak >= 7 ? "badge success" : streak >= 3 ? "badge warning" : "badge"}>
                      {streak > 0 ? `🔥 ${streak}` : "—"}
                    </span>
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
