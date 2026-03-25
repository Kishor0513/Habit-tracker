import AsyncStorage from "@react-native-async-storage/async-storage";
import { uid } from "../lib/ids";
import { isoToday } from "../lib/date";

const STORE_KEY = "habit_tracker_v1";

function nowIso() {
  return new Date().toISOString();
}

async function loadStore() {
  const raw = await AsyncStorage.getItem(STORE_KEY);
  if (!raw) return { habits: [], entries: [], projects: [], settings: {} };
  try {
    const parsed = JSON.parse(raw);
    return {
      habits: Array.isArray(parsed.habits) ? parsed.habits : [],
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      settings: parsed.settings && typeof parsed.settings === "object" ? parsed.settings : {}
    };
  } catch {
    return { habits: [], entries: [], projects: [], settings: {} };
  }
}

async function saveStore(store) {
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(store));
}

export class LocalHabitApi {
  static async create() {
    return new LocalHabitApi();
  }

  entryId(habitId, isoDate) {
    return `${habitId}__${isoDate}`;
  }

  async listHabits() {
    const store = await loadStore();
    return store.habits;
  }

  async upsertHabit(habit) {
    const store = await loadStore();
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
      updatedAt: nowIso()
    };
    const idx = store.habits.findIndex((h) => h.id === full.id);
    if (idx >= 0) store.habits[idx] = full;
    else store.habits.push(full);
    await saveStore(store);
    return full;
  }

  async archiveHabit(habitId) {
    const store = await loadStore();
    const idx = store.habits.findIndex((h) => h.id === habitId);
    if (idx < 0) return;
    store.habits[idx] = { ...store.habits[idx], archivedAt: nowIso(), updatedAt: nowIso() };
    await saveStore(store);
  }

  async unarchiveHabit(habitId) {
    const store = await loadStore();
    const idx = store.habits.findIndex((h) => h.id === habitId);
    if (idx < 0) return;
    store.habits[idx] = { ...store.habits[idx], archivedAt: null, updatedAt: nowIso() };
    await saveStore(store);
  }

  async getEntry(habitId, isoDate) {
    const id = this.entryId(habitId, isoDate);
    const store = await loadStore();
    return store.entries.find((e) => e.id === id) ?? null;
  }

  async setEntry({ habitId, date, value, note }) {
    const id = this.entryId(habitId, date);
    const store = await loadStore();
    const idx = store.entries.findIndex((e) => e.id === id);
    const createdAt = idx >= 0 ? store.entries[idx].createdAt : nowIso();
    const entry = {
      id,
      habitId,
      date,
      value,
      note: note ?? "",
      updatedAt: nowIso(),
      createdAt
    };
    if (idx >= 0) store.entries[idx] = entry;
    else store.entries.push(entry);
    await saveStore(store);
    return entry;
  }

  async deleteEntry(habitId, isoDate) {
    const id = this.entryId(habitId, isoDate);
    const store = await loadStore();
    store.entries = store.entries.filter((e) => e.id !== id);
    await saveStore(store);
  }

  async listEntries() {
    const store = await loadStore();
    return store.entries;
  }

  async listProjects() {
    const store = await loadStore();
    return store.projects;
  }

  async upsertProject(project) {
    const store = await loadStore();
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
      archivedAt: project.archivedAt ?? null
    };
    const idx = store.projects.findIndex((p) => p.id === full.id);
    if (idx >= 0) store.projects[idx] = full;
    else store.projects.push(full);
    await saveStore(store);
    return full;
  }

  async deleteProject(projectId) {
    const store = await loadStore();
    store.projects = store.projects.filter((p) => p.id !== projectId);
    await saveStore(store);
  }

  async getSetting(key) {
    const store = await loadStore();
    const value = store.settings?.[key];
    if (value === undefined) return null;
    return { key, value, updatedAt: nowIso() };
  }

  async setSetting(key, value) {
    const store = await loadStore();
    store.settings = store.settings ?? {};
    store.settings[key] = value;
    await saveStore(store);
  }

  async exportAll() {
    return loadStore();
  }

  async importAll(payload) {
    const next = {
      habits: Array.isArray(payload?.habits) ? payload.habits : [],
      entries: Array.isArray(payload?.entries) ? payload.entries : [],
      projects: Array.isArray(payload?.projects) ? payload.projects : [],
      settings: payload?.settings && typeof payload.settings === "object" ? payload.settings : {}
    };
    await saveStore(next);
  }
}

