import React, { useEffect, useMemo, useState } from "react";
import { isoToday, lastNDays } from "../lib/date.js";
import { entryMeetsTarget, isDueOn } from "../lib/habits.js";
import { useApp } from "../state/AppState.jsx";
import { useToast } from "../state/ToastState.jsx";
import Modal from "../components/Modal.jsx";
import EmptyState from "../components/EmptyState.jsx";

function projectProgress({ project, habitsById, entriesByKey }) {
  const end = isoToday();
  const days = lastNDays(7, end);
  let due = 0;
  let done = 0;
  for (const day of days) {
    for (const habitId of project.habitIds ?? []) {
      const habit = habitsById.get(habitId);
      if (!habit) continue;
      if (!isDueOn(habit, day)) continue;
      due += 1;
      const entry = entriesByKey.get(`${habitId}__${day}`);
      if (entryMeetsTarget(habit, entry)) done += 1;
    }
  }
  const rate = due === 0 ? 0 : done / due;
  return { due, done, rate };
}

function ProjectEditor({ initial, habits, onCancel, onSave }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [goal, setGoal] = useState(initial?.goal ?? "");
  const [why, setWhy] = useState(initial?.why ?? "");
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? "");
  const [milestones, setMilestones] = useState((initial?.milestones ?? []).join("\n"));
  const [habitIds, setHabitIds] = useState(new Set(initial?.habitIds ?? []));

  function toggleHabit(id) {
    setHabitIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="stack">
      <div className="card">
        <h2>Project</h2>
        <div className="stack">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Run a 5K" />
          <input className="input" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="What does success look like?" />
          <input className="input" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </div>
      </div>
      <div className="card">
        <h2>Why</h2>
        <textarea className="textarea" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Why does this matter to you?" />
      </div>
      <div className="card">
        <h2>Milestones</h2>
        <textarea className="textarea" value={milestones} onChange={(e) => setMilestones(e.target.value)} placeholder="One milestone per line (keep them small)" />
      </div>
      <div className="card">
        <h2>Linked habits</h2>
        <p className="subtle">Progress is driven by habits you actually do.</p>
        <div className="stack">
          {habits.map((h) => (
            <label key={h.id} className="row" style={{ gap: 10 }}>
              <input type="checkbox" checked={habitIds.has(h.id)} onChange={() => toggleHabit(h.id)} />
              <span>{h.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
        <button className="btn" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn primary"
          type="button"
          onClick={() =>
            onSave({
              ok: true,
              value: {
                ...initial,
                name: name.trim(),
                goal: goal.trim(),
                why: why.trim(),
                targetDate,
                milestones: milestones
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
                habitIds: [...habitIds],
              },
            })
          }
        >
          Save project
        </button>
      </div>
    </div>
  );
}

function ProjectDetail({ project, habitsById }) {
  return (
    <div className="stack">
      <div className="card">
        <h2>Goal</h2>
        <div className="subtle">{project.goal || "Define success in one sentence."}</div>
        {project.targetDate ? <div className="subtle">Target date: {project.targetDate}</div> : null}
      </div>
      <div className="card">
        <h2>Why</h2>
        <div className="subtle">{project.why || "Write your reason to stay motivated."}</div>
      </div>
      <div className="card">
        <h2>Milestones</h2>
        {project.milestones?.length ? (
          <div className="stack" style={{ gap: 6 }}>
            {project.milestones.map((m, idx) => (
              <div key={idx} className="subtle">
                • {m}
              </div>
            ))}
          </div>
        ) : (
          <div className="subtle">Add milestones (one per line).</div>
        )}
      </div>
      <div className="card">
        <h2>Linked habits</h2>
        {project.habitIds?.length ? (
          <div className="stack">
            {project.habitIds.map((id) => (
              <div key={id} className="row" style={{ gap: 10 }}>
                <span className="badge">habit</span>
                <div className="subtle">{habitsById.get(id)?.name ?? "(missing)"}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="subtle">Link 1–3 habits to drive progress.</div>
        )}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { api, isReady, dataVersion, refresh } = useApp();
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [habits, setHabits] = useState([]);
  const [entriesByKey, setEntriesByKey] = useState(new Map());
  const [activeProject, setActiveProject] = useState(null);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (!api) return;
    let alive = true;
    Promise.all([api.listProjects(), api.listHabits(), api.listEntries()])
      .then(([p, h, e]) => {
        if (!alive) return;
        setProjects(p.filter((x) => !x.archivedAt));
        setHabits(h.filter((x) => !x.archivedAt));
        setEntriesByKey(new Map(e.map((x) => [x.id, x])));
      })
      .catch((err) => console.error(err));
    return () => {
      alive = false;
    };
  }, [api, dataVersion]);

  const habitsById = useMemo(() => new Map(habits.map((h) => [h.id, h])), [habits]);

  if (!isReady) return <div className="card">Loading…</div>;

  return (
    <div className="stack">
      <div className="card">
        <div className="row between">
          <div>
            <h2>Projects</h2>
            <div className="subtle">Tie habits to outcomes: fitness, learning, business, health.</div>
          </div>
          <button className="btn primary" type="button" onClick={() => setEditing({})}>
            + New project
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          body="Load example packs in Settings or create a project and link habits."
          action={
            <a className="btn" href="#/settings">
              Load examples
            </a>
          }
        />
      ) : (
        <div className="list">
          {projects.map((project) => {
            const progress = projectProgress({ project, habitsById, entriesByKey });
            return (
              <div key={project.id} className="item">
                <div className="row between" style={{ gap: 14 }}>
                  <div className="stack" style={{ gap: 4, minWidth: 0 }}>
                    <div className="itemName" style={{ fontWeight: 750 }}>
                      {project.name}
                    </div>
                    <div className="subtle">{project.goal || "No goal set yet."}</div>
                    <div className="subtle">
                      7-day habit progress: {Math.round(progress.rate * 100)}% · Linked habits:{" "}
                      {(project.habitIds ?? []).length}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 10 }}>
                    <button className="btn" type="button" onClick={() => setActiveProject(project)}>
                      Open
                    </button>
                    <button
                      className="btn danger"
                      type="button"
                      onClick={async () => {
                        await api.deleteProject(project.id);
                        toast.push("Deleted.");
                        refresh();
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeProject ? (
        <Modal
          title={activeProject.name}
          onClose={() => setActiveProject(null)}
          actions={
            <button
              className="btn"
              type="button"
              onClick={() => {
                setEditing(activeProject);
                setActiveProject(null);
              }}
            >
              Edit
            </button>
          }
        >
          <ProjectDetail project={activeProject} habitsById={habitsById} />
        </Modal>
      ) : null}

      {editing ? (
        <Modal title={editing.id ? "Edit project" : "New project"} onClose={() => setEditing(null)}>
          <ProjectEditor
            initial={editing.id ? editing : null}
            habits={habits}
            onCancel={() => setEditing(null)}
            onSave={async (result) => {
              const cleanName = result.value.name?.trim();
              if (!cleanName) return toast.push("Project name is required.");
              await api.upsertProject({ ...result.value, name: cleanName });
              toast.push("Saved.");
              setEditing(null);
              refresh();
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}

