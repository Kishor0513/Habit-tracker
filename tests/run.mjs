import assert from "node:assert/strict";
import { addDays, dayOfWeek, isoToDate, dateToISO, startOfISOWeek } from "../src/lib/date.js";
import { entryMeetsTarget, EntryStatus, HabitType, isDueOn, ScheduleKind } from "../src/lib/habits.js";
import { currentStreak, weeklyGoalProgress } from "../src/lib/stats.js";

function testDate() {
  assert.equal(addDays("2026-03-25", 1), "2026-03-26");
  assert.equal(addDays("2026-03-25", -1), "2026-03-24");
  assert.equal(dayOfWeek("2026-03-23"), 1); // Mon
  assert.equal(dayOfWeek("2026-03-29"), 7); // Sun
  assert.equal(startOfISOWeek("2026-03-25"), "2026-03-23");
  assert.equal(dateToISO(isoToDate("2026-03-25")), "2026-03-25");
}

function testTargets() {
  const binary = { type: HabitType.binary };
  assert.equal(entryMeetsTarget(binary, null), false);
  assert.equal(entryMeetsTarget(binary, { value: 1 }), true);
  assert.equal(entryMeetsTarget(binary, { value: 0 }), false);

  const qty = { type: HabitType.quantity, target: 10 };
  assert.equal(entryMeetsTarget(qty, { value: 9 }), false);
  assert.equal(entryMeetsTarget(qty, { value: 10 }), true);
}

function testSchedule() {
  const h = { archivedAt: null, schedule: { kind: ScheduleKind.weekdays, days: [1, 3, 5] } }; // Mon Wed Fri
  assert.equal(isDueOn(h, "2026-03-23"), true); // Mon
  assert.equal(isDueOn(h, "2026-03-24"), false); // Tue
  assert.equal(isDueOn(h, "2026-03-25"), true); // Wed

  const custom = { archivedAt: null, schedule: { kind: ScheduleKind.custom, days: [2, 4] } };
  assert.equal(isDueOn(custom, "2026-03-24"), true); // Tue
  assert.equal(isDueOn(custom, "2026-03-25"), false); // Wed

  const interval = { archivedAt: null, createdAt: "2026-03-20T10:00:00.000Z", schedule: { kind: ScheduleKind.interval, every: 3, startDate: "2026-03-20" } };
  assert.equal(isDueOn(interval, "2026-03-20"), true);
  assert.equal(isDueOn(interval, "2026-03-21"), false);
  assert.equal(isDueOn(interval, "2026-03-23"), true);
}

function testStreak() {
  const habit = { id: "h1", archivedAt: null, type: HabitType.binary, schedule: { kind: ScheduleKind.daily } };
  const entries = new Map([
    ["h1__2026-03-25", { value: 1 }],
    ["h1__2026-03-24", { value: 1 }],
    ["h1__2026-03-23", { value: 1 }],
    ["h1__2026-03-22", { value: 0 }],
  ]);
  assert.equal(currentStreak(habit, entries, "2026-03-25"), 3);

  const protectedHabit = { ...habit, id: "h2", skipRule: "protect" };
  const protectedEntries = new Map([
    ["h2__2026-03-25", { value: 1, status: EntryStatus.done }],
    ["h2__2026-03-24", { value: 0, status: EntryStatus.skipped }],
    ["h2__2026-03-23", { value: 1, status: EntryStatus.done }],
  ]);
  assert.equal(currentStreak(protectedHabit, protectedEntries, "2026-03-25"), 3);
}

function testWeeklyGoal() {
  const habit = { id: "h3", archivedAt: null, type: HabitType.binary, goalFrequency: 3 };
  const entries = new Map([
    ["h3__2026-03-25", { value: 1, status: EntryStatus.done }],
    ["h3__2026-03-24", { value: 1, status: EntryStatus.done }],
    ["h3__2026-03-22", { value: 1, status: EntryStatus.done }],
  ]);
  const result = weeklyGoalProgress(habit, entries, [
    "2026-03-19",
    "2026-03-20",
    "2026-03-21",
    "2026-03-22",
    "2026-03-23",
    "2026-03-24",
    "2026-03-25",
  ]);
  assert.equal(result.completions, 3);
  assert.equal(result.met, true);
}

testDate();
testTargets();
testSchedule();
testStreak();
testWeeklyGoal();

console.log("OK");
