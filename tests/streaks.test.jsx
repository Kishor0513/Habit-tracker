import { describe, it, expect } from 'vitest';
import { currentStreak, completionRateLastNDays, entryMeetsTarget } from '../src/lib/stats.js';
import { isDueOn } from '../src/lib/habits.js';
import { addDays } from '../src/lib/date.js';

describe('streaks library', () => {
	const FIXED_TODAY = '2025-01-15';
	const FIXED_END_ISO = '2025-03-15';

	// Helper to build entriesByKey map
	const makeEntriesByKey = (entries) => {
		const map = new Map();
		for (const e of entries) {
			map.set(`${e.habitId}__${e.date}`, e);
		}
		return map;
	};

	describe('currentStreak', () => {
		it('calculates streak for a daily habit with consecutive entries', () => {
			// Habit due every day, entries on 2025-03-13, 2025-03-14, 2025-03-15
			const habit = { id: 'h1', schedule: { kind: 'daily' }, type: 'binary' };
			const entries = [
				{ habitId: 'h1', date: '2025-03-13', status: 'done', value: 1 },
				{ habitId: 'h1', date: '2025-03-14', status: 'done', value: 1 },
				{ habitId: 'h1', date: '2025-03-15', status: 'done', value: 1 },
			];
			const entriesByKey = makeEntriesByKey(entries);
			const streak = currentStreak(habit, entriesByKey, FIXED_END_ISO, 120);
			expect(streak).toBe(3);
		});

		it('calculates streak starting from today', () => {
			const habit = { id: 'h1', schedule: { kind: 'daily' }, type: 'binary' };
			const entries = [
				{ habitId: 'h1', date: '2025-01-15', status: 'done', value: 1 },
				{ habitId: 'h1', date: '2025-01-14', status: 'done', value: 1 },
				{ habitId: 'h1', date: '2025-01-13', status: 'done', value: 1 },
			];
			const entriesByKey = makeEntriesByKey(entries);
			const streak = currentStreak(habit, entriesByKey, FIXED_TODAY, 120);
			expect(streak).toBe(3);
		});

		it('breaks streak on missing entry', () => {
			const habit = { id: 'h1', schedule: { kind: 'daily' }, type: 'binary' };
			const entries = [
				{ habitId: 'h1', date: '2025-01-15', status: 'done', value: 1 },
				{ habitId: 'h1', date: '2025-01-14', status: 'done', value: 1 },
				// Missing 2025-01-13
			];
			const entriesByKey = makeEntriesByKey(entries);
			const streak = currentStreak(habit, entriesByKey, FIXED_TODAY, 120);
			expect(streak).toBe(2);
		});

		it('handles skipped entries with protect rule', () => {
			const habit = { id: 'h1', schedule: { kind: 'daily' }, type: 'binary', skipRule: 'protect' };
			const entries = [
				{ habitId: 'h1', date: '2025-01-15', status: 'skipped' },
				{ habitId: 'h1', date: '2025-01-14', status: 'done', value: 1 },
				{ habitId: 'h1', date: '2025-01-13', status: 'done', value: 1 },
			];
			const entriesByKey = makeEntriesByKey(entries);
			const streak = currentStreak(habit, entriesByKey, FIXED_TODAY, 120);
			// With protect, skipped counts as part of streak
			expect(streak).toBe(3);
		});

		it('returns 0 when no due entries', () => {
			const habit = { id: 'h1', schedule: { kind: 'daily' }, type: 'binary' };
			const entries = [];
			const entriesByKey = makeEntriesByKey(entries);
			const streak = currentStreak(habit, entriesByKey, FIXED_TODAY, 120);
			expect(streak).toBe(0);
		});
	});

	describe('completionRateLastNDays', () => {
		it('calculates completion rate for n days', () => {
			const habit = { id: 'h1', schedule: { kind: 'daily' }, type: 'binary', goalFrequency: 7 };
			const entries = [
				{ habitId: 'h1', date: '2025-03-15', status: 'done', value: 1 },
				{ habitId: 'h1', date: '2025-03-14', status: 'done', value: 1 },
				{ habitId: 'h1', date: '2025-03-13', status: 'done', value: 1 },
			];
			const entriesByKey = makeEntriesByKey(entries);
			const { days, due, done, rate } = completionRateLastNDays([habit], entriesByKey, 7, FIXED_END_ISO);
			expect(days.length).toBe(7);
			expect(due).toBe(7); // daily habit = due every day
			expect(done).toBe(3); // 3 entries met target
			expect(rate).toBe(3 / 7); // 3 out of 7 days completed
		});

		it('handles zero due days gracefully when no habit schedule matches', () => {
			// Use a custom schedule with days that don't match any in the period
			const habit = { id: 'h1', schedule: { kind: 'custom', days: [99] }, type: 'binary' };
			const entries = [];
			const entriesByKey = makeEntriesByKey(entries);
			const { days, due, done, rate } = completionRateLastNDays([habit], entriesByKey, 7, FIXED_END_ISO);
			expect(due).toBe(0);
			expect(done).toBe(0);
			expect(rate).toBe(0);
		});
	});

	describe('isDueOn', () => {
		it('checks custom interval schedule', () => {
			const habit = {
				id: 'h1',
				schedule: { kind: 'interval', every: 2, startDate: '2025-01-01' },
			};
			// Due on Jan 1 (day 1), Jan 3 (day 3), Jan 5 (day 5)...
			expect(isDueOn(habit, '2025-01-01')).toBe(true);
			expect(isDueOn(habit, '2025-01-03')).toBe(true);
			expect(isDueOn(habit, '2025-01-02')).toBe(false);
		});

		it('checks weekday schedule', () => {
			const habit = {
				id: 'h1',
				schedule: { kind: 'weekdays', days: [1, 2, 3, 4, 5] },
			};
			// 2025-01-13 is Monday (1), 2025-01-18 is Saturday (7)
			expect(isDueOn(habit, '2025-01-13')).toBe(true); // Monday
			expect(isDueOn(habit, '2025-01-18')).toBe(false); // Saturday
		});
	});
});