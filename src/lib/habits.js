import { dayOfWeek } from "./date.js";

export const HabitType = Object.freeze({
  binary: "binary",
  quantity: "quantity",
});

export const ScheduleKind = Object.freeze({
  daily: "daily",
  weekdays: "weekdays",
  custom: "custom",
  interval: "interval",
});

export const EntryStatus = Object.freeze({
  pending: "pending",
  done: "done",
  skipped: "skipped",
});

export const WEEKDAY_OPTIONS = [
  { value: 1, short: "Mon", tiny: "M" },
  { value: 2, short: "Tue", tiny: "T" },
  { value: 3, short: "Wed", tiny: "W" },
  { value: 4, short: "Thu", tiny: "T" },
  { value: 5, short: "Fri", tiny: "F" },
  { value: 6, short: "Sat", tiny: "S" },
  { value: 7, short: "Sun", tiny: "S" },
];

function safeArray(values, fallback) {
  return Array.isArray(values) && values.length ? values : fallback;
}

export function normalizeSchedule(schedule, createdAt) {
  const base = schedule ?? { kind: ScheduleKind.daily };
  if (base.kind === ScheduleKind.weekdays) {
    return { kind: ScheduleKind.weekdays, days: safeArray(base.days, [1, 2, 3, 4, 5]) };
  }
  if (base.kind === ScheduleKind.custom) {
    return { kind: ScheduleKind.custom, days: safeArray(base.days, [1, 3, 5]) };
  }
  if (base.kind === ScheduleKind.interval) {
    return {
      kind: ScheduleKind.interval,
      every: Math.max(1, Number(base.every ?? 2)),
      startDate: base.startDate ?? createdAt?.slice?.(0, 10) ?? null,
    };
  }
  return { kind: ScheduleKind.daily };
}

export function habitEntryStatus(habit, entry) {
  if (!entry) return EntryStatus.pending;
  if (entry.status === EntryStatus.skipped) return EntryStatus.skipped;
  if (habit.type === HabitType.binary) {
    return Number(entry.value ?? 0) >= 1 ? EntryStatus.done : EntryStatus.pending;
  }
  return Number(entry.value ?? 0) >= Number(habit.target ?? 1)
    ? EntryStatus.done
    : EntryStatus.pending;
}

export function isDueOn(habit, isoDate) {
  if (habit.archivedAt) return false;
  const schedule = normalizeSchedule(habit.schedule, habit.createdAt);
  if (schedule.kind === ScheduleKind.daily) return true;
  if (schedule.kind === ScheduleKind.weekdays) {
    const days = schedule.days ?? [1, 2, 3, 4, 5];
    return days.includes(dayOfWeek(isoDate));
  }
  if (schedule.kind === ScheduleKind.custom) {
    return safeArray(schedule.days, [1, 3, 5]).includes(dayOfWeek(isoDate));
  }
  if (schedule.kind === ScheduleKind.interval) {
    if (!schedule.startDate) return true;
    const start = new Date(`${schedule.startDate}T12:00:00`);
    const current = new Date(`${isoDate}T12:00:00`);
    const diffDays = Math.round((current - start) / 86400000);
    if (diffDays < 0) return false;
    return diffDays % Math.max(1, Number(schedule.every ?? 1)) === 0;
  }
  return true;
}

export function targetLabel(habit) {
  if (habit.type === HabitType.binary) return "Done / Not done";
  const unit = habit.unit ? ` ${habit.unit}` : "";
  return `Target: ${habit.target ?? 1}${unit}`;
}

export function entryMeetsTarget(habit, entry) {
  if (!entry || entry.status === EntryStatus.skipped) return false;
  if (habit.type === HabitType.binary) return Number(entry.value ?? 0) >= 1;
  const target = Number(habit.target ?? 1);
  const value = Number(entry.value ?? 0);
  return value >= target;
}

export function scheduleLabel(habit) {
  const schedule = normalizeSchedule(habit.schedule, habit.createdAt);
  if (schedule.kind === ScheduleKind.daily) return "Every day";
  if (schedule.kind === ScheduleKind.weekdays) return "Weekdays";
  if (schedule.kind === ScheduleKind.custom) {
    return safeArray(schedule.days, [1, 3, 5])
      .map((day) => WEEKDAY_OPTIONS.find((item) => item.value === day)?.short ?? day)
      .join(", ");
  }
  if (schedule.kind === ScheduleKind.interval) {
    const every = Math.max(1, Number(schedule.every ?? 1));
    return every === 1 ? "Every day" : `Every ${every} days`;
  }
  return "Every day";
}

export function habitGoalLabel(habit) {
  const frequency = Number(habit.goalFrequency ?? 0);
  if (!frequency) return null;
  return `${frequency}x per week`;
}
