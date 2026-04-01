import React, { useEffect, useMemo, useState } from "react";
import { HabitType } from "../lib/habits.js";
import { completionRateLastNDays, currentStreak } from "../lib/stats.js";
import { useApp } from "../state/AppState.jsx";
import { useToast } from "../state/ToastState.jsx";
import Modal from "../components/Modal.jsx";
import EmptyState from "../components/EmptyState.jsx";

const COLORS = [
  "#6366f1", "#818cf8", "#22c55e", "#06b6d4",
  "#f59e0b", "#f43f5e", "#a855f7", "#ec4899",
];

// ─── Color Swatch Picker ──────────────────────────────────────────────────────
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

// ─── Habit Editor ─────────────────────────────────────────────────────────────
function HabitEditor({ initial, onCancel, onSave }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState(initial?.type ?? HabitType.binary);
  const [target, setTarget] = useState(String(initial?.target ?? 10));
  const [unit, setUnit] = useState(initial?.unit ?? "min");
  const [schedule, setSchedule] = useState(initial?.schedule?.kind ?? "daily");
  const [color, setColor] = useState(initial?.color ?? COLORS[0]);
  const [notes, setNotes] = useState(initial?.notes ?? "");

  return (
    <div className="stack">
      {/* Row 1 */}
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
            <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
              <option value={HabitType.binary}>Binary — done / not done</option>
              <option value={HabitType.quantity}>Quantity — minutes, pages, reps…</option>
            </select>
          </div>
        </div>

        <div className="card">
          <h2>Schedule</h2>
          <div className="stack">
            <select className="select" value={schedule} onChange={(e) => setSchedule(e.target.value)}>
              <option value="daily">Every day</option>
              <option value="weekdays">Weekdays only</option>
            </select>
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid two">
        <div className="card">
          <h2>Target <span className="badge" style={{ verticalAlign: 'middle' }}>quantity only</span></h2>
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
          <p className="subtle" style={{ margin: 0 }}>Ignored for binary habits.</p>
        </div>

        <div className="card">
          <h2>Notes</h2>
          <textarea
            className="textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Cues, friction reducers, rules…"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
        <button className="btn ghost" type="button" onClick={onCancel}>Cancel</button>
        <button
          className="btn primary"
          type="button"
          onClick={() => {
            const cleanName = name.trim();
            if (!cleanName) return onSave({ ok: false, error: "Name is required." });
            const qtyTarget = Number.parseInt(target, 10);
            if (type === HabitType.quantity && (!Number.isFinite(qtyTarget) || qtyTarget <= 0)) {
              return onSave({ ok: false, error: "Quantity target must be a positive number." });
            }
            onSave({
              ok: true,
              value: {
                ...initial,
                name: cleanName,
                type,
                target: type === HabitType.quantity ? qtyTarget : 1,
                unit: type === HabitType.quantity ? unit.trim() : "",
                schedule: schedule === "weekdays"
                  ? { kind: "weekdays", days: [1, 2, 3, 4, 5] }
                  : { kind: "daily" },
                color,
                notes: notes.trim(),
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

// ─── Habits Page ──────────────────────────────────────────────────────────────
export default function HabitsPage() {
  const { api, isReady, dataVersion, refresh } = useApp();
  const toast = useToast();
  const [habits, setHabits] = useState([]);
  const [entriesByKey, setEntriesByKey] = useState(new Map());
  const [editing, setEditing] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

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

  const cards = useMemo(() => {
    return habits.map((habit) => {
      const stats = completionRateLastNDays([habit], entriesByKey, 14);
      const streak = currentStreak(habit, entriesByKey);
      return { habit, stats, streak };
    });
  }, [habits, entriesByKey]);

  if (!isReady) return <div className="card"><p className="subtle">Loading…</p></div>;

  return (
    <div className="stack">
      <div className="card">
        <div className="sectionHeader">
          <div>
            <h2>Habits</h2>
            <div className="subtle">Build systems, not just streaks.</div>
          </div>
          <button
            className="btn primary"
            type="button"
            onClick={() => { setEditing(null); setShowEditor(true); }}
          >
            + New habit
          </button>
        </div>
      </div>

      {habits.length === 0 ? (
        <EmptyState
          title="No habits yet"
          body="Load example packs in Settings, or create your first habit here."
          action={<a className="btn" href="#/settings">Load examples</a>}
        />
      ) : (
        <div className="list">
          {cards.map(({ habit, stats, streak }) => {
            const pct = Math.round(stats.rate * 100);
            const streakClass = streak >= 7 ? "badge success" : streak >= 3 ? "badge warning" : "badge";
            const rateClass = pct >= 80 ? "badge success" : pct >= 50 ? "badge warning" : "badge danger";

            return (
              <div key={habit.id} className="item">
                <div className="row between" style={{ gap: 14 }}>
                  <div className="stack" style={{ gap: 6, minWidth: 0, flex: 1 }}>
                    <div className="row" style={{ gap: 10, minWidth: 0 }}>
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
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <span className={rateClass}>{pct}% (14d)</span>
                      <span className={streakClass}>{streak > 0 ? `🔥 ${streak}` : "no streak"}</span>
                    </div>
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
