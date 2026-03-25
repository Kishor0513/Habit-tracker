import assert from "node:assert/strict";
import { addDays, dayOfWeek, isoToDate, dateToISO, startOfISOWeek } from "../src/lib/date.js";
import { entryMeetsTarget, HabitType, isDueOn, ScheduleKind } from "../src/lib/habits.js";
import { currentStreak } from "../src/lib/stats.js";

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
}

testDate();
testTargets();
testSchedule();
testStreak();

console.log("OK");

