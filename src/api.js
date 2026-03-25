import { del, get, getAll, openDb, put, tx } from "./db.js";
import { uid } from "./lib/ids.js";
import { isoToday } from "./lib/date.js";

function nowIso() {
  return new Date().toISOString();
}

export class HabitApi {
  constructor(db) {
    this.db = db;
  }

  static async create() {
    const db = await openDb();
    return new HabitApi(db);
  }

  async listHabits() {
    return tx(this.db, "habits", "readonly", async ({ habits }) => getAll(habits));
  }

  async upsertHabit(habit) {
    const full = {
      id: habit.id ?? uid("habit"),
      name: habit.name?.trim() ?? "Untitled habit",
      type: habit.type ?? "binary",
      color: habit.color ?? "#7c5cff",
      unit: habit.unit ?? "",
      target: habit.target ?? 1,
      schedule: habit.schedule ?? { kind: "daily" },
      notes: habit.notes ?? "",
      createdAt: habit.createdAt ?? nowIso(),
      archivedAt: habit.archivedAt ?? null,
      updatedAt: nowIso(),
    };
    await tx(this.db, "habits", "readwrite", async ({ habits }) => put(habits, full));
    return full;
  }

  async archiveHabit(habitId) {
    const habit = await tx(this.db, "habits", "readonly", async ({ habits }) => get(habits, habitId));
    if (!habit) return;
    await this.upsertHabit({ ...habit, archivedAt: nowIso() });
  }

  async unarchiveHabit(habitId) {
    const habit = await tx(this.db, "habits", "readonly", async ({ habits }) => get(habits, habitId));
    if (!habit) return;
    await this.upsertHabit({ ...habit, archivedAt: null });
  }

  entryId(habitId, isoDate) {
    return `${habitId}__${isoDate}`;
  }

  async getEntry(habitId, isoDate) {
    const id = this.entryId(habitId, isoDate);
    return tx(this.db, "entries", "readonly", async ({ entries }) => get(entries, id));
  }

  async setEntry({ habitId, date, value, note }) {
    const id = this.entryId(habitId, date);
    return tx(this.db, "entries", "readwrite", async ({ entries }) => {
      const existing = await get(entries, id);
      const entry = {
        id,
        habitId,
        date,
        value,
        note: note ?? "",
        updatedAt: nowIso(),
        createdAt: existing?.createdAt ?? nowIso(),
      };
      await put(entries, entry);
      return entry;
    });
  }

  async deleteEntry(habitId, isoDate) {
    const id = this.entryId(habitId, isoDate);
    await tx(this.db, "entries", "readwrite", async ({ entries }) => del(entries, id));
  }

  async listEntries() {
    return tx(this.db, "entries", "readonly", async ({ entries }) => getAll(entries));
  }

  async listProjects() {
    return tx(this.db, "projects", "readonly", async ({ projects }) => getAll(projects));
  }

  async upsertProject(project) {
    const full = {
      id: project.id ?? uid("project"),
      name: project.name?.trim() ?? "Untitled project",
      goal: project.goal?.trim() ?? "",
      why: project.why?.trim() ?? "",
      startDate: project.startDate ?? isoToday(),
      targetDate: project.targetDate ?? "",
      milestones: project.milestones ?? [],
      habitIds: project.habitIds ?? [],
      createdAt: project.createdAt ?? nowIso(),
      updatedAt: nowIso(),
      archivedAt: project.archivedAt ?? null,
    };
    await tx(this.db, "projects", "readwrite", async ({ projects }) => put(projects, full));
    return full;
  }

  async deleteProject(projectId) {
    await tx(this.db, "projects", "readwrite", async ({ projects }) => del(projects, projectId));
  }

  async getSetting(key) {
    return tx(this.db, "settings", "readonly", async ({ settings }) => get(settings, key));
  }

  async setSetting(key, value) {
    await tx(this.db, "settings", "readwrite", async ({ settings }) =>
      put(settings, { key, value, updatedAt: nowIso() }),
    );
  }
}
