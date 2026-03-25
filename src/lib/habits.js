import { dayOfWeek } from "./date.js";

export const HabitType = Object.freeze({
  binary: "binary",
  quantity: "quantity",
});

export const ScheduleKind = Object.freeze({
  daily: "daily",
  weekdays: "weekdays",
});

export function isDueOn(habit, isoDate) {
  if (habit.archivedAt) return false;
  const schedule = habit.schedule ?? { kind: ScheduleKind.daily };
  if (schedule.kind === ScheduleKind.daily) return true;
  if (schedule.kind === ScheduleKind.weekdays) {
    const days = schedule.days ?? [1, 2, 3, 4, 5];
    return days.includes(dayOfWeek(isoDate));
  }
  return true;
}

export function targetLabel(habit) {
  if (habit.type === HabitType.binary) return "Done / Not done";
  const unit = habit.unit ? ` ${habit.unit}` : "";
  return `Target: ${habit.target ?? 1}${unit}`;
}

export function entryMeetsTarget(habit, entry) {
  if (!entry) return false;
  if (habit.type === HabitType.binary) return entry.value === 1;
  const target = Number(habit.target ?? 1);
  const value = Number(entry.value ?? 0);
  return value >= target;
}

