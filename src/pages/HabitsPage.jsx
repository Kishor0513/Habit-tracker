import React, { useEffect, useMemo, useState } from "react";
import {
  HabitType,
  normalizeSchedule,
  ScheduleKind,
  scheduleLabel,
  habitGoalLabel,
  WEEKDAY_OPTIONS,
} from "../lib/habits.js";
import {
  completionRateLastNDays,
  currentStreak,
  weeklyGoalProgress,
} from "../lib/stats.js";
import { lastNDays } from "../lib/date.js";
import { useApp } from "../state/AppState.jsx";
import { useToast } from "../state/ToastState.jsx";
import Modal from "../components/Modal.jsx";
import EmptyState from "../components/EmptyState.jsx";

const COLORS = [
  "#6366f1", "#818cf8", "#22c55e", "#06b6d4",
  "#f59e0b", "#f43f5e", "#a855f7", "#ec4899",
];

function DayPicker({ days, onToggle }) {
  return (
    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
      {WEEKDAY_OPTIONS.map((day) => {
        const active = days.includes(day.value);
        return (
          <button
            key={day.value}
            type="button"
            className={active ? "btn primary" : "btn ghost"}
            style={{ minWidth: 54, padding: "8px 12px" }}
            onClick={() => onToggle(day.value)}
          >
            {day.short}
          </button>
        );
      })}
    </div>
  );
}

function ColorPicker({ value, onChange }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 8 }}>Color</div>
      <div className="colorSwatches">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={`colorSwatch ${value === c ? "selected" : ""}`}
            style={{ background: c }}
            aria-label={`Select color ${c}`}
            onClick={() => onChange(c)}
          />
        ))}
      </div>
    </div>
  );
}

function HabitEditor({ initial, onCancel, onSave }) {
  const scheduleState = normalizeSchedule(initial?.schedule, initial?.createdAt);
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [type, setType] = useState(initial?.type ?? HabitType.binary);
  const [target, setTarget] = useState(String(initial?.target ?? 10));
  const [unit, setUnit] = useState(initial?.unit ?? "min");
  const [scheduleKind, setScheduleKind] = useState(scheduleState.kind);
  const [customDays, setCustomDays] = useState(scheduleState.days ?? [1, 3, 5]);
  const [intervalEvery, setIntervalEvery] = useState(String(scheduleState.every ?? 2));
  const [goalFrequency, setGoalFrequency] = useState(String(initial?.goalFrequency ?? 0));
  const [color, setColor] = useState(initial?.color ?? COLORS[0]);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [skipRule, setSkipRule] = useState(initial?.skipRule ?? "break");
  const [reminderEnabled, setReminderEnabled] = useState(Boolean(initial?.reminder?.enabled));
  const [reminderTime, setReminderTime] = useState(initial?.reminder?.time ?? "08:00");

  function toggleDay(day) {
    setCustomDays((prev) => {
      const exists = prev.includes(day);
      if (exists) return prev.filter((value) => value !== day);
      return [...prev, day].sort((a, b) => a - b);
    });
  }

  return (
    <div className="stack">
      <div className="grid two">
        <div className="card">
          <h2>Basics</h2>
          <div className="stack">
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Deep work"
              autoFocus
            />
            <div className="twoCols">
              <input
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Category: Health, Learning..."
              />
              <input
                className="input"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Tags: focus, morning"
              />
            </div>
            <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
              <option value={HabitType.binary}>Binary</option>
              <option value={HabitType.quantity}>Quantity</option>
            </select>
          </div>
        </div>

        <div className="card">
          <h2>Targeting</h2>
          <div className="stack">
            <div className="twoCols">
              <input
                className="input"
                type="number"
                min={1}
                step={1}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                disabled={type !== HabitType.quantity}
                placeholder="Target"
              />
              <input
                className="input"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="min / pages / reps"
                disabled={type !== HabitType.quantity}
              />
            </div>
            <input
              className="input"
              type="number"
              min={0}
              max={7}
              value={goalFrequency}
              onChange={(e) => setGoalFrequency(e.target.value)}
              placeholder="Weekly goal"
            />
            <p className="subtle" style={{ margin: 0 }}>
              Set a weekly goal like `3` for “3 times per week”.
            </p>
          </div>
        </div>
      </div>

      <div className="grid two">
        <div className="card">
          <h2>Recurrence</h2>
          <div className="stack">
            <select className="select" value={scheduleKind} onChange={(e) => setScheduleKind(e.target.value)}>
              <option value={ScheduleKind.daily}>Every day</option>
              <option value={ScheduleKind.weekdays}>Weekdays</option>
              <option value={ScheduleKind.custom}>Custom weekdays</option>
              <option value={ScheduleKind.interval}>Every N days</option>
            </select>
            {scheduleKind === ScheduleKind.custom ? (
              <DayPicker days={customDays} onToggle={toggleDay} />
            ) : null}
            {scheduleKind === ScheduleKind.interval ? (
              <input
                className="input"
                type="number"
                min={1}
                step={1}
                value={intervalEvery}
                onChange={(e) => setIntervalEvery(e.target.value)}
                placeholder="Every 2 days"
              />
            ) : null}
          </div>
        </div>

        <div className="card">
          <h2>Reminder & Recovery</h2>
          <div className="stack">
            <label className="row" style={{ gap: 10 }}>
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(e) => setReminderEnabled(e.target.checked)}
              />
              <span>Enable reminder</span>
            </label>
            <input
              className="input"
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              disabled={!reminderEnabled}
            />
            <select className="select" value={skipRule} onChange={(e) => setSkipRule(e.target.value)}>
              <option value="break">Skipped day breaks streak</option>
              <option value="protect">Skipped day protects streak</option>
            </select>
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Notes</h2>
        <textarea
          className="textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Cues, friction reducers, fallback rules, what counts as success..."
        />
      </div>

      <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
        <button className="btn ghost" type="button" onClick={onCancel}>Cancel</button>
        <button
          className="btn primary"
          type="button"
          onClick={() => {
            const cleanName = name.trim();
            if (!cleanName) return onSave({ ok: false, error: "Name is required." });
            const qtyTarget = Number.parseInt(target, 10);
            const goal = Number.parseInt(goalFrequency || "0", 10);
            if (type === HabitType.quantity && (!Number.isFinite(qtyTarget) || qtyTarget <= 0)) {
              return onSave({ ok: false, error: "Quantity target must be a positive number." });
            }
            if (!Number.isFinite(goal) || goal < 0 || goal > 7) {
              return onSave({ ok: false, error: "Weekly goal must be between 0 and 7." });
            }

            let schedule = { kind: ScheduleKind.daily };
            if (scheduleKind === ScheduleKind.weekdays) {
              schedule = { kind: ScheduleKind.weekdays, days: [1, 2, 3, 4, 5] };
            } else if (scheduleKind === ScheduleKind.custom) {
              if (customDays.length === 0) {
                return onSave({ ok: false, error: "Select at least one weekday for a custom schedule." });
              }
              schedule = { kind: ScheduleKind.custom, days: customDays };
            } else if (scheduleKind === ScheduleKind.interval) {
              const every = Number.parseInt(intervalEvery, 10);
              if (!Number.isFinite(every) || every <= 0) {
                return onSave({ ok: false, error: "Interval must be a positive number of days." });
              }
              schedule = {
                kind: ScheduleKind.interval,
                every,
                startDate: scheduleState.startDate ?? initial?.createdAt?.slice?.(0, 10) ?? new Date().toISOString().slice(0, 10),
              };
            }

            onSave({
              ok: true,
              value: {
                ...initial,
                name: cleanName,
                category: category.trim(),
                tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
                type,
                target: type === HabitType.quantity ? qtyTarget : 1,
                unit: type === HabitType.quantity ? unit.trim() : "",
                schedule,
                goalFrequency: goal,
                color,
                notes: notes.trim(),
                reminder: { enabled: reminderEnabled, time: reminderTime || "08:00" },
                skipRule,
              },
            });
          }}
        >
          Save habit
        </button>
      </div>
    </div>
  );
}

export default function HabitsPage() {
  const { api, isReady, dataVersion, refresh } = useApp();
  const toast = useToast();
  const [habits, setHabits] = useState([]);
  const [entriesByKey, setEntriesByKey] = useState(new Map());
  const [editing, setEditing] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

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

  const categories = useMemo(() => {
    return [...new Set(habits.map((habit) => habit.category).filter(Boolean))];
  }, [habits]);

  const filteredHabits = useMemo(() => {
    return habits.filter((habit) => {
      const haystack = [habit.name, habit.category, ...(habit.tags ?? [])].join(" ").toLowerCase();
      const matchesQuery = !query.trim() || haystack.includes(query.trim().toLowerCase());
      const matchesCategory = category === "all" || habit.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [habits, query, category]);

  const cards = useMemo(() => {
    const week = lastNDays(7);
    return filteredHabits.map((habit) => {
      const stats = completionRateLastNDays([habit], entriesByKey, 14);
      const streak = currentStreak(habit, entriesByKey);
      const weeklyGoal = weeklyGoalProgress(habit, entriesByKey, week);
      return { habit, stats, streak, weeklyGoal };
    });
  }, [filteredHabits, entriesByKey]);

  if (!isReady) return <div className="card"><p className="subtle">Loading…</p></div>;

  return (
    <div className="stack">
      <div className="card">
        <div className="sectionHeader">
          <div>
            <h2>Habits</h2>
            <div className="subtle">Custom recurrence, tags, reminders, and recovery rules in one place.</div>
          </div>
          <button
            className="btn primary"
            type="button"
            onClick={() => { setEditing(null); setShowEditor(true); }}
          >
            + New habit
          </button>
        </div>
        <div className="row" style={{ gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <input
            className="input"
            style={{ maxWidth: 320 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search habits, categories, tags"
          />
          <select className="select" style={{ maxWidth: 220 }} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>

      {habits.length === 0 ? (
        <EmptyState
          title="No habits yet"
          body="Load example packs in Settings, or create your first habit here."
          action={<a className="btn" href="#/settings">Load examples</a>}
        />
      ) : cards.length === 0 ? (
        <div className="card"><p className="subtle">No habits match the current filters.</p></div>
      ) : (
        <div className="list">
          {cards.map(({ habit, stats, streak, weeklyGoal }) => {
            const pct = Math.round(stats.rate * 100);
            const streakClass = streak >= 7 ? "badge success" : streak >= 3 ? "badge warning" : "badge";
            const rateClass = pct >= 80 ? "badge success" : pct >= 50 ? "badge warning" : "badge danger";
            const goalLabel = habitGoalLabel(habit);

            return (
              <div key={habit.id} className="item">
                <div className="row between" style={{ gap: 14, alignItems: "flex-start" }}>
                  <div className="stack" style={{ gap: 8, minWidth: 0, flex: 1 }}>
                    <div className="row" style={{ gap: 10, minWidth: 0, flexWrap: "wrap" }}>
                      <div
                        className="dot"
                        style={{
                          background: habit.color,
                          boxShadow: `0 0 0 3px ${habit.color}30`,
                          width: 12, height: 12,
                        }}
                      />
                      <div className="itemName">{habit.name}</div>
                      <span className={habit.type === HabitType.binary ? "badge" : "badge accent"}>
                        {habit.type === HabitType.binary ? "binary" : "qty"}
                      </span>
                      {habit.category ? <span className="badge">{habit.category}</span> : null}
                    </div>

                    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                      <span className={rateClass}>{pct}% (14d)</span>
                      <span className={streakClass}>{streak > 0 ? `🔥 ${streak}` : "no streak"}</span>
                      <span className="badge">{scheduleLabel(habit)}</span>
                      {goalLabel ? (
                        <span className={weeklyGoal.met ? "badge success" : "badge warning"}>
                          {weeklyGoal.completions}/{weeklyGoal.target} this week
                        </span>
                      ) : null}
                      {habit.reminder?.enabled ? <span className="badge accent">Reminds at {habit.reminder.time}</span> : null}
                      <span className={habit.skipRule === "protect" ? "badge success" : "badge"}>
                        {habit.skipRule === "protect" ? "skip protects streak" : "skip breaks streak"}
                      </span>
                    </div>

                    {(habit.tags ?? []).length ? (
                      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                        {habit.tags.map((tag) => (
                          <span key={tag} className="badge">#{tag}</span>
                        ))}
                      </div>
                    ) : null}

                    {habit.notes ? (
                      <div className="subtle" style={{ whiteSpace: "pre-wrap" }}>
                        {habit.notes}
                      </div>
                    ) : null}
                  </div>

                  <div className="row" style={{ gap: 8 }}>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => { setEditing(habit); setShowEditor(true); }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn danger"
                      type="button"
                      onClick={async () => {
                        await api.archiveHabit(habit.id);
                        toast.push("Archived.");
                        refresh();
                      }}
                    >
                      Archive
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showEditor ? (
        <Modal title={editing ? "Edit habit" : "New habit"} onClose={() => setShowEditor(false)}>
          <HabitEditor
            initial={editing}
            onCancel={() => setShowEditor(false)}
            onSave={async (result) => {
              if (!result.ok) return toast.push(result.error);
              await api.upsertHabit(result.value);
              toast.push("Saved.");
              setShowEditor(false);
              refresh();
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}
