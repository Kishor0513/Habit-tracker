import { addDays, isoToday, lastNDays } from "./date";
import { entryMeetsTarget, isDueOn } from "./habits";

export function computeTodaySummary(habits, entriesByHabitToday, today) {
  const due = (habits ?? []).filter((h) => isDueOn(h, today));
  let doneCount = 0;
  for (const h of due) {
    const entry = entriesByHabitToday.get(h.id) ?? null;
    if (entryMeetsTarget(h, entry)) doneCount += 1;
  }
  return { dueCount: due.length, doneCount };
}

export function completionRateLastNDays(habits, entriesByKey, n = 14, endIso = isoToday()) {
  const days = lastNDays(n, endIso);
  let dueCount = 0;
  let doneCount = 0;
  for (const day of days) {
    for (const h of habits) {
      if (!isDueOn(h, day)) continue;
      dueCount += 1;
      const entry = entriesByKey.get(`${h.id}__${day}`) ?? null;
      if (entryMeetsTarget(h, entry)) doneCount += 1;
    }
  }
  return { dueCount, doneCount, rate: dueCount ? doneCount / dueCount : 0 };
}

export function currentStreak(habit, entriesByKey, endIso = isoToday()) {
  let streak = 0;
  let day = endIso;
  for (let i = 0; i < 365; i += 1) {
    if (!isDueOn(habit, day)) {
      day = addDays(day, -1);
      continue;
    }
    const entry = entriesByKey.get(`${habit.id}__${day}`) ?? null;
    if (entryMeetsTarget(habit, entry)) {
      streak += 1;
      day = addDays(day, -1);
      continue;
    }
    break;
  }
  return streak;
}

