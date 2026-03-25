import { dayOfWeek } from "./date";

export const HabitType = {
  binary: "binary",
  quantity: "quantity"
};

export const ScheduleKind = {
  daily: "daily",
  weekdays: "weekdays"
};

export function isDueOn(habit, isoDate) {
  const schedule = habit?.schedule ?? { kind: ScheduleKind.daily };
  if (schedule.kind === ScheduleKind.daily) return true;
  if (schedule.kind === ScheduleKind.weekdays) {
    const dow = dayOfWeek(isoDate);
    return (schedule.days ?? [1, 2, 3, 4, 5]).includes(dow);
  }
  return true;
}

export function entryMeetsTarget(habit, entry) {
  if (!habit) return false;
  if (!entry) return false;
  if (habit.type === HabitType.binary) return Boolean(entry.value);
  const target = Number(habit.target ?? 0);
  return Number(entry.value ?? 0) >= target;
}

export function targetLabel(habit) {
  if (!habit) return "";
  if (habit.type === HabitType.binary) return "Binary habit";
  const target = habit.target ?? 0;
  const unit = habit.unit ? ` ${habit.unit}` : "";
  return `Target: ${target}${unit}`;
}

