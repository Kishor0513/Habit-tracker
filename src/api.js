import { del, get, getAll, openDb, put, tx } from "./db.js";
import { uid } from "./lib/ids.js";
import { isoToday } from "./lib/date.js";
import { EntryStatus, normalizeSchedule } from "./lib/habits.js";

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
      schedule: normalizeSchedule(habit.schedule, habit.createdAt ?? nowIso()),
      notes: habit.notes ?? "",
      category: habit.category?.trim() ?? "",
      tags: Array.isArray(habit.tags) ? habit.tags.filter(Boolean) : [],
      goalFrequency: Math.max(0, Number(habit.goalFrequency ?? 0)),
      reminder: habit.reminder ?? { enabled: false, time: "08:00" },
      skipRule: habit.skipRule ?? "break",
      priority: habit.priority ?? "medium",
      linkedPlaylistId: habit.linkedPlaylistId ?? "",
      orderIndex: Number(habit.orderIndex ?? Date.now()),
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

  async setEntry({ habitId, date, value, note, status, mood, playlistId, completedAt }) {
    const id = this.entryId(habitId, date);
    return tx(this.db, "entries", "readwrite", async ({ entries }) => {
      const existing = await get(entries, id);
      const nextStatus =
        status ?? existing?.status ?? (Number(value ?? 0) > 0 ? EntryStatus.done : EntryStatus.pending);
      const entry = {
        id,
        habitId,
        date,
        value,
        note: note ?? "",
        status: nextStatus,
        mood: mood ?? existing?.mood ?? "",
        playlistId: playlistId ?? existing?.playlistId ?? "",
        completedAt:
          completedAt ??
          existing?.completedAt ??
          (nextStatus === EntryStatus.done ? nowIso() : null),
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

  async listHabitSessions() {
    return tx(this.db, "habitSessions", "readonly", async ({ habitSessions }) =>
      getAll(habitSessions),
    );
  }

  async upsertHabitSession(session) {
    const full = {
      id: session.id ?? uid("habit_session"),
      habitId: session.habitId,
      userId: session.userId ?? "local",
      startTime: session.startTime ?? nowIso(),
      endTime: session.endTime ?? null,
      playlistId: session.playlistId ?? "",
      success: Boolean(session.success),
      durationSeconds: Number(session.durationSeconds ?? 0),
      createdAt: session.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };
    await tx(this.db, "habitSessions", "readwrite", async ({ habitSessions }) =>
      put(habitSessions, full),
    );
    return full;
  }

  async listDailyReviews() {
    return tx(this.db, "dailyReviews", "readonly", async ({ dailyReviews }) =>
      getAll(dailyReviews),
    );
  }

  async upsertDailyReview(review) {
    const full = {
      id: review.id ?? uid("daily_review"),
      userId: review.userId ?? "local",
      date: review.date ?? isoToday(),
      mood: review.mood ?? "",
      notes: review.notes ?? "",
      wins: review.wins ?? "",
      misses: review.misses ?? "",
      createdAt: review.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };
    await tx(this.db, "dailyReviews", "readwrite", async ({ dailyReviews }) =>
      put(dailyReviews, full),
    );
    return full;
  }

  async listWeeklyReviews() {
    return tx(this.db, "weeklyReviews", "readonly", async ({ weeklyReviews }) =>
      getAll(weeklyReviews),
    );
  }

  async upsertWeeklyReview(review) {
    const full = {
      id: review.id ?? uid("weekly_review"),
      userId: review.userId ?? "local",
      weekStart: review.weekStart ?? isoToday(),
      summary: review.summary ?? "",
      completionRate: Number(review.completionRate ?? 0),
      bestHabitId: review.bestHabitId ?? "",
      worstHabitId: review.worstHabitId ?? "",
      suggestions: review.suggestions ?? [],
      createdAt: review.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };
    await tx(this.db, "weeklyReviews", "readwrite", async ({ weeklyReviews }) =>
      put(weeklyReviews, full),
    );
    return full;
  }
}
