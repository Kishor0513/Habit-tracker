import { describe, it, expect } from 'vitest';
import {
	normalizeSchedule,
	isDueOn,
	entryMeetsTarget,
	habitEntryStatus,
	ScheduleKind,
	EntryStatus,
} from '../src/lib/habits.js';
import { dayOfWeek } from '../src/lib/date.js';

describe('habits library', () => {
	describe('normalizeSchedule', () => {
		it('defaults to daily', () => {
			expect(normalizeSchedule(null, '2025-01-01')).toEqual({ kind: ScheduleKind.daily });
		});

		it('parses weekdays with defaults', () => {
			expect(normalizeSchedule({ kind: ScheduleKind.weekdays }, '2025-01-01')).toEqual({
				kind: ScheduleKind.weekdays,
				days: [1, 2, 3, 4, 5],
			});
		});

		it('parses custom days', () => {
			expect(normalizeSchedule({ kind: ScheduleKind.custom, days: [1, 4] }, '2025-01-01')).toEqual({
				kind: ScheduleKind.custom,
				days: [1, 4],
			});
		});

		it('parses interval with defaults', () => {
			expect(normalizeSchedule({ kind: ScheduleKind.interval }, '2025-01-01')).toEqual({
				kind: ScheduleKind.interval,
				every: 2,
				startDate: '2025-01-01',
			});
		});
	});

	describe('isDueOn', () => {
		const habit = { id: 'h1', schedule: { kind: ScheduleKind.daily }, archivedAt: null };

		it('returns true for daily habits', () => {
			expect(isDueOn(habit, '2025-01-01')).toBe(true);
			expect(isDueOn(habit, '2025-01-15')).toBe(true);
		});

		it('returns false for archived habits', () => {
			expect(isDueOn({ ...habit, archivedAt: '2025-01-10' }, '2025-01-15')).toBe(false);
		});

		it('checks weekdays correctly', () => {
			const weekdayHabit = { ...habit, schedule: { kind: ScheduleKind.weekdays, days: [1, 2, 3, 4, 5] } };
			expect(isDueOn(weekdayHabit, '2025-01-13')).toBe(true); // Monday
			expect(isDueOn(weekdayHabit, '2025-01-18')).toBe(false); // Saturday
		});
	});

	describe('entryMeetsTarget', () => {
		it('binary habit - done when value >= 1', () => {
			const habit = { type: 'binary' };
			expect(entryMeetsTarget(habit, { value: 1 })).toBe(true);
			expect(entryMeetsTarget(habit, { value: 0 })).toBe(false);
			expect(entryMeetsTarget(habit, null)).toBe(false);
		});

		it('quantity habit - done when value >= target', () => {
			const habit = { type: 'quantity', target: 10 };
			expect(entryMeetsTarget(habit, { value: 10 })).toBe(true);
			expect(entryMeetsTarget(habit, { value: 9 })).toBe(false);
		});
	});

	describe('habitEntryStatus', () => {
		it('returns skipped for skipped entries', () => {
			const habit = { type: 'binary' };
			expect(habitEntryStatus(habit, { status: EntryStatus.skipped })).toBe(EntryStatus.skipped);
		});

		it('returns pending for missing entry', () => {
			const habit = { type: 'binary' };
			expect(habitEntryStatus(habit, null)).toBe(EntryStatus.pending);
		});

		it('returns done for completed binary habit', () => {
			const habit = { type: 'binary' };
			expect(habitEntryStatus(habit, { value: 1 })).toBe(EntryStatus.done);
		});
	});
});