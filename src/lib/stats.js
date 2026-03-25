import { addDays, isoToday, lastNDays } from "./date.js";
import { entryMeetsTarget, isDueOn } from "./habits.js";

export function computeTodaySummary(habits, entriesByHabitId, todayIso = isoToday()) {
  const due = habits.filter((h) => isDueOn(h, todayIso));
  const completed = due.filter((h) => entryMeetsTarget(h, entriesByHabitId.get(h.id)));
  return { dueCount: due.length, doneCount: completed.length };
}

export function completionRateLastNDays(habits, entriesByKey, n = 14, endIso = isoToday()) {
  const days = lastNDays(n, endIso);
  let due = 0;
  let done = 0;
  for (const day of days) {
    for (const habit of habits) {
      if (!isDueOn(habit, day)) continue;
      due += 1;
      const entry = entriesByKey.get(`${habit.id}__${day}`);
      if (entryMeetsTarget(habit, entry)) done += 1;
    }
  }
  const rate = due === 0 ? 0 : done / due;
  return { days, due, done, rate };
}

export function currentStreak(habit, entriesByKey, endIso = isoToday(), lookback = 120) {
  let streak = 0;
  let cursor = endIso;
  for (let i = 0; i < lookback; i += 1) {
    if (!isDueOn(habit, cursor)) {
      cursor = addDays(cursor, -1);
      continue;
    }
    const entry = entriesByKey.get(`${habit.id}__${cursor}`);
    if (!entryMeetsTarget(habit, entry)) break;
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

