import { describe, it, expect } from 'vitest';
import {
	isoToday,
	addDays,
	lastNDays,
	startOfISOWeek,
	dayOfWeek,
} from '../src/lib/date.js';

describe('date library', () => {
	describe('isoToday', () => {
		it('returns ISO date string', () => {
			const today = isoToday();
			expect(typeof today).toBe('string');
			expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		});
	});

	describe('addDays', () => {
		it('adds positive days', () => {
			expect(addDays('2025-01-15', 1)).toBe('2025-01-16');
			expect(addDays('2025-01-31', 1)).toBe('2025-02-01');
		});

		it('subtracts days with negative', () => {
			expect(addDays('2025-01-15', -1)).toBe('2025-01-14');
			expect(addDays('2025-03-01', -1)).toBe('2025-02-28');
		});

		it('handles regular month boundaries', () => {
			expect(addDays('2025-01-31', 1)).toBe('2025-02-01');
			expect(addDays('2025-05-31', 1)).toBe('2025-06-01');
		});
	});

	describe('lastNDays', () => {
		it('returns array of dates ending with endIso', () => {
			const days = lastNDays(7, '2025-01-15');
			expect(days.length).toBe(7);
			expect(days[days.length - 1]).toBe('2025-01-15');
			expect(days[0]).toBe('2025-01-09');
		});
	});

	describe('startOfISOWeek', () => {
		it('returns Monday of the week', () => {
			expect(startOfISOWeek('2025-01-15')).toBe('2025-01-13'); // Monday
			expect(startOfISOWeek('2025-01-19')).toBe('2025-01-13'); // Sunday -> previous Monday
		});
	});

	describe('dayOfWeek', () => {
		it('returns 1 for Monday, 7 for Sunday', () => {
			expect(dayOfWeek('2025-01-13')).toBe(1); // Monday
			expect(dayOfWeek('2025-01-14')).toBe(2); // Tuesday
			expect(dayOfWeek('2025-01-19')).toBe(7); // Sunday
		});
	});
});