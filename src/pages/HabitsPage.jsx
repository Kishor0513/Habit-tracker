import React, { useEffect, useMemo, useState } from "react";
import { HabitType } from "../lib/habits.js";
import { completionRateLastNDays, currentStreak } from "../lib/stats.js";
import { useApp } from "../state/AppState.jsx";
import { useToast } from "../state/ToastState.jsx";
import Modal from "../components/Modal.jsx";
import EmptyState from "../components/EmptyState.jsx";

const COLORS = ["#7c5cff", "#22c55e", "#06b6d4", "#f59e0b", "#ef4444", "#a855f7", "#f43f5e"];

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
      <div className="grid two">
        <div className="card">
          <h2>Basics</h2>
          <div className="stack">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Deep work" />
            <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
              <option value={HabitType.binary}>Binary (done / not done)</option>
              <option value={HabitType.quantity}>Quantity (minutes, pages, etc.)</option>
            </select>
          </div>
        </div>
        <div className="card">
          <h2>Schedule</h2>
          <div className="stack">
            <select className="select" value={schedule} onChange={(e) => setSchedule(e.target.value)}>
              <option value="daily">Every day</option>
              <option value="weekdays">Weekdays</option>
            </select>
            <select className="select" value={color} onChange={(e) => setColor(e.target.value)}>
              {COLORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="subtle">Tip: start with daily or weekdays. Consistency first.</p>
          </div>
        </div>
      </div>

      <div className="grid two">
        <div className="card">
          <h2>Target (for quantity)</h2>
          <div className="twoCols">
            <input
              className="input"
              type="number"
              min={1}
              step={1}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              disabled={type !== HabitType.quantity}
            />
            <input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="min / pages / reps" disabled={type !== HabitType.quantity} />
          </div>
          <p className="subtle">If you use Binary, target is ignored.</p>
        </div>
        <div className="card">
          <h2>Notes</h2>
          <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Cues, friction reducers, rules…" />
        </div>
      </div>

      <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
        <button className="btn" type="button" onClick={onCancel}>
          Cancel
        </button>
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
                schedule: schedule === "weekdays" ? { kind: "weekdays", days: [1, 2, 3, 4, 5] } : { kind: "daily" },
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

export default function HabitsPage() {
  const { api, isReady, dataVersion, refresh } = useApp();
  const toast = useToast();
  const [habits, setHabits] = useState([]);
  const [entriesByKey, setEntriesByKey] = useState(new Map());
  const [editing, setEditing] = useState(null); // habit or null
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
    return () => {
      alive = false;
    };
  }, [api, dataVersion]);

  const cards = useMemo(() => {
    return habits.map((habit) => {
      const stats = completionRateLastNDays([habit], entriesByKey, 14);
      const streak = currentStreak(habit, entriesByKey);
      return { habit, stats, streak };
    });
  }, [habits, entriesByKey]);

  if (!isReady) return <div className="card">Loading…</div>;

  return (
    <div className="stack">
      <div className="card">
        <div className="row between">
          <div>
            <h2>Habits</h2>
            <div className="subtle">Build systems, not just streaks.</div>
          </div>
          <button
            className="btn primary"
            type="button"
            onClick={() => {
              setEditing(null);
              setShowEditor(true);
            }}
          >
            + New habit
          </button>
        </div>
      </div>

      {habits.length === 0 ? (
        <EmptyState
          title="No habits yet"
          body="Load example packs in Settings, or create your first habit here."
          action={
            <a className="btn" href="#/settings">
              Load examples
            </a>
          }
        />
      ) : (
        <div className="list">
          {cards.map(({ habit, stats, streak }) => (
            <div key={habit.id} className="item">
              <div className="row between" style={{ gap: 14 }}>
                <div className="stack" style={{ gap: 4, minWidth: 0 }}>
                  <div className="row" style={{ gap: 10, minWidth: 0 }}>
                    <div className="dot" style={{ background: habit.color, boxShadow: `0 0 0 4px ${habit.color}22` }} />
                    <div className="itemName">{habit.name}</div>
                    <span className="badge">{habit.type === HabitType.binary ? "binary" : "quantity"}</span>
                  </div>
                  <div className="subtle">
                    14-day completion: {Math.round(stats.rate * 100)}% · Current streak: {streak}
                  </div>
                </div>
                <div className="row" style={{ gap: 10 }}>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      setEditing(habit);
                      setShowEditor(true);
                    }}
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
          ))}
        </div>
      )}

      {showEditor ? (
        <Modal
          title={editing ? "Edit habit" : "New habit"}
          onClose={() => setShowEditor(false)}
        >
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
